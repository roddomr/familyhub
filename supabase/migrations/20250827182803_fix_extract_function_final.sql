-- Final fix for EXTRACT function error in budget recommendations
-- The issue is that date subtraction in PostgreSQL sometimes returns integer instead of interval

-- Drop and recreate get_budget_recommendations with proper date handling
DROP FUNCTION IF EXISTS get_budget_recommendations(UUID, DATE, DATE);

CREATE OR REPLACE FUNCTION get_budget_recommendations(
  family_id_param UUID,
  start_date_param DATE DEFAULT CURRENT_DATE - INTERVAL '90 days',
  end_date_param DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  recommendation_type VARCHAR,
  category_name VARCHAR,
  current_spending DECIMAL(12,2),
  recommended_budget DECIMAL(12,2),
  potential_savings DECIMAL(12,2),
  confidence_score DECIMAL(3,2), -- 0.0 to 1.0
  reason TEXT,
  action_items JSONB
) AS $$
DECLARE
  period_days INTEGER;
  monthly_multiplier DECIMAL(5,2);
BEGIN
  -- Calculate the number of days in the period using AGE function
  SELECT EXTRACT(EPOCH FROM AGE(end_date_param::TIMESTAMP, start_date_param::TIMESTAMP))::INTEGER / (24 * 60 * 60) + 1
  INTO period_days;
  
  -- Ensure we have at least 1 day
  period_days := GREATEST(period_days, 1);
  
  -- Calculate monthly multiplier (assuming 30 days per month)
  monthly_multiplier := 30.0 / period_days;

  RETURN QUERY
  WITH category_analysis AS (
    SELECT 
      tc.name as category_name,
      COUNT(t.id) as transaction_count,
      SUM(t.amount) as total_spending,
      AVG(t.amount) as avg_transaction,
      STDDEV(t.amount) as spending_variance,
      -- Calculate monthly average using the period multiplier
      (SUM(t.amount) * monthly_multiplier) as monthly_avg
    FROM transactions t
    JOIN transaction_categories tc ON tc.id = t.category_id
    WHERE t.family_id = family_id_param
      AND t.type = 'expense'
      AND t.date >= start_date_param
      AND t.date <= end_date_param
    GROUP BY tc.id, tc.name
    HAVING SUM(t.amount) > 0
  ),
  family_income AS (
    SELECT COALESCE(SUM(t.amount), 0) * monthly_multiplier as total_monthly_income
    FROM transactions t
    WHERE t.family_id = family_id_param
      AND t.type = 'income'
      AND t.date >= start_date_param
      AND t.date <= end_date_param
  ),
  total_family_expenses AS (
    SELECT COALESCE(SUM(total_spending), 0) as total_expenses
    FROM category_analysis
  ),
  category_recommendations AS (
    SELECT 
      ca.category_name,
      ca.total_spending,
      ca.monthly_avg,
      ca.transaction_count,
      ca.spending_variance,
      -- High-spending categories (>15% of expenses) should be optimized
      CASE 
        WHEN ca.total_spending > (SELECT total_expenses * 0.15 FROM total_family_expenses) THEN
          ca.total_spending * 0.85 -- Suggest 15% reduction
        WHEN COALESCE(ca.spending_variance, 0) > COALESCE(ca.avg_transaction * 2, 100) THEN
          ca.total_spending * 0.90 -- High variance suggests optimization potential
        ELSE ca.total_spending * 0.95 -- Minor optimization
      END as recommended_budget,
      -- Confidence based on data consistency and spending patterns
      CASE
        WHEN ca.transaction_count >= 10 AND COALESCE(ca.spending_variance, 0) <= COALESCE(ca.avg_transaction, 0) THEN 0.90
        WHEN ca.transaction_count >= 5 THEN 0.75
        ELSE 0.60
      END as confidence_score
    FROM category_analysis ca
  )
  -- High-impact reduction recommendations
  SELECT 
    'reduce_category'::VARCHAR as recommendation_type,
    cr.category_name::VARCHAR,
    cr.total_spending,
    cr.recommended_budget,
    (cr.total_spending - cr.recommended_budget) as potential_savings,
    cr.confidence_score,
    CASE 
      WHEN cr.total_spending > (SELECT total_expenses * 0.20 FROM total_family_expenses) THEN
        'This category represents over 20% of your family expenses. Reducing spending here will have significant impact on your budget.'::TEXT
      WHEN COALESCE(cr.spending_variance, 0) > (SELECT AVG(COALESCE(spending_variance, 0)) FROM category_recommendations) THEN
        'Your spending in this category is inconsistent. Setting a budget limit could help control expenses.'::TEXT
      ELSE
        'This category has potential for optimization based on your spending patterns.'::TEXT
    END as reason,
    jsonb_build_object(
      'set_monthly_limit', ROUND((cr.recommended_budget * monthly_multiplier)::DECIMAL, 2),
      'track_daily', true,
      'review_frequency', 'weekly',
      'suggest_alternatives', CASE WHEN cr.category_name IN ('Dining', 'Entertainment', 'Food', 'Restaurant') THEN true ELSE false END
    ) as action_items
  FROM category_recommendations cr
  WHERE (cr.total_spending - cr.recommended_budget) > 50 -- Only show recommendations with meaningful savings
  
  UNION ALL
  
  -- Emergency fund recommendations
  SELECT 
    'emergency_fund'::VARCHAR as recommendation_type,
    'Emergency Fund'::VARCHAR as category_name,
    0::DECIMAL as current_spending,
    GREATEST(fi.total_monthly_income * 0.10, 100) as recommended_budget, -- At least $100 or 10% of income
    GREATEST(fi.total_monthly_income * 0.10, 100) as potential_savings,
    0.95::DECIMAL as confidence_score,
    'Building an emergency fund is crucial for financial security. Aim to save at least 10% of your income for emergencies.'::TEXT as reason,
    jsonb_build_object(
      'start_amount', LEAST(GREATEST(fi.total_monthly_income * 0.05, 50), 500),
      'monthly_target', GREATEST(fi.total_monthly_income * 0.10, 100),
      'automate', true,
      'separate_account', true
    ) as action_items
  FROM family_income fi
  WHERE fi.total_monthly_income > 0
  
  UNION ALL
  
  -- Savings rate improvement recommendations
  SELECT 
    'increase_savings'::VARCHAR as recommendation_type,
    'Savings Target'::VARCHAR as category_name,
    0::DECIMAL as current_spending,
    GREATEST(fi.total_monthly_income * 0.20, 200) as recommended_budget, -- Target 20% savings rate or at least $200
    GREATEST(
      fi.total_monthly_income * 0.20 - 
      COALESCE((SELECT SUM(potential_savings) FROM category_recommendations WHERE (total_spending - recommended_budget) > 50), 0), 
      0
    ) as potential_savings,
    0.85::DECIMAL as confidence_score,
    'Financial experts recommend saving 20% of income. Here''s how to reach that goal based on your current spending patterns.'::TEXT as reason,
    jsonb_build_object(
      'current_savings_rate', CASE 
        WHEN fi.total_monthly_income > 0 THEN 
          ROUND(((fi.total_monthly_income - COALESCE((SELECT SUM(total_spending) * monthly_multiplier FROM category_analysis), 0)) / fi.total_monthly_income * 100)::DECIMAL, 1)
        ELSE 0 
      END,
      'target_savings_rate', 20,
      'monthly_savings_target', GREATEST(fi.total_monthly_income * 0.20, 200),
      'investment_consideration', CASE WHEN fi.total_monthly_income > 3000 THEN true ELSE false END
    ) as action_items
  FROM family_income fi
  WHERE fi.total_monthly_income > 0
  
  ORDER BY potential_savings DESC, confidence_score DESC;
END;
$$ LANGUAGE plpgsql;