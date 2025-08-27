-- AI-Driven Budget Recommendations Functions

-- Function to generate budget recommendations based on spending patterns
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
BEGIN
  RETURN QUERY
  WITH category_analysis AS (
    SELECT 
      tc.name as category_name,
      COUNT(t.id) as transaction_count,
      SUM(t.amount) as total_spending,
      AVG(t.amount) as avg_transaction,
      STDDEV(t.amount) as spending_variance,
      -- Calculate monthly average
      (SUM(t.amount) / GREATEST(EXTRACT(EPOCH FROM (end_date_param - start_date_param)) / (30 * 24 * 60 * 60), 1)) as monthly_avg
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
    SELECT COALESCE(SUM(t.amount), 0) as total_income
    FROM transactions t
    WHERE t.family_id = family_id_param
      AND t.type = 'income'
      AND t.date >= start_date_param
      AND t.date <= end_date_param
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
        WHEN ca.total_spending > (SELECT SUM(total_spending) * 0.15 FROM category_analysis) THEN
          ca.total_spending * 0.85 -- Suggest 15% reduction
        WHEN ca.spending_variance > ca.avg_transaction * 2 THEN
          ca.total_spending * 0.90 -- High variance suggests optimization potential
        ELSE ca.total_spending * 0.95 -- Minor optimization
      END as recommended_budget,
      -- Confidence based on data consistency and spending patterns
      CASE
        WHEN ca.transaction_count >= 10 AND ca.spending_variance <= ca.avg_transaction THEN 0.90
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
      WHEN cr.total_spending > (SELECT SUM(total_spending) * 0.20 FROM category_analysis) THEN
        'This category represents over 20% of your family expenses. Reducing spending here will have significant impact on your budget.'
      WHEN cr.spending_variance > (SELECT AVG(spending_variance) FROM category_recommendations) THEN
        'Your spending in this category is inconsistent. Setting a budget limit could help control expenses.'
      ELSE
        'This category has potential for optimization based on your spending patterns.'
    END::TEXT as reason,
    jsonb_build_object(
      'set_monthly_limit', cr.recommended_budget / 3, -- Assume 3-month period
      'track_daily', true,
      'review_frequency', 'weekly',
      'suggest_alternatives', CASE WHEN cr.category_name IN ('Dining', 'Entertainment') THEN true ELSE false END
    ) as action_items
  FROM category_recommendations cr
  WHERE (cr.total_spending - cr.recommended_budget) > 50 -- Only show recommendations with meaningful savings
  
  UNION ALL
  
  -- Emergency fund recommendations
  SELECT 
    'emergency_fund'::VARCHAR as recommendation_type,
    'Emergency Fund'::VARCHAR as category_name,
    0::DECIMAL as current_spending,
    (fi.total_income * 0.10) as recommended_budget, -- 10% of income for emergency fund
    (fi.total_income * 0.10) as potential_savings,
    0.95::DECIMAL as confidence_score,
    'Building an emergency fund is crucial for financial security. Aim to save at least 10% of your income.'::TEXT as reason,
    jsonb_build_object(
      'start_amount', LEAST(fi.total_income * 0.05, 500),
      'monthly_target', fi.total_income * 0.10 / 12,
      'automate', true,
      'separate_account', true
    ) as action_items
  FROM family_income fi
  WHERE fi.total_income > 0
  
  UNION ALL
  
  -- Savings rate improvement recommendations
  SELECT 
    'increase_savings'::VARCHAR as recommendation_type,
    'Savings Target'::VARCHAR as category_name,
    0::DECIMAL as current_spending,
    (fi.total_income * 0.20) as recommended_budget, -- Target 20% savings rate
    (fi.total_income * 0.20 - COALESCE((SELECT SUM(potential_savings) FROM category_recommendations), 0)) as potential_savings,
    0.85::DECIMAL as confidence_score,
    'Financial experts recommend saving 20% of income. Here''s how to reach that goal.'::TEXT as reason,
    jsonb_build_object(
      'current_savings_rate', ROUND(((fi.total_income - (SELECT COALESCE(SUM(total_spending), 0) FROM category_analysis)) / NULLIF(fi.total_income, 0) * 100)::DECIMAL, 1),
      'target_savings_rate', 20,
      'monthly_savings_target', fi.total_income * 0.20 / 12,
      'investment_consideration', CASE WHEN fi.total_income > 5000 THEN true ELSE false END
    ) as action_items
  FROM family_income fi
  WHERE fi.total_income > 0
  
  ORDER BY potential_savings DESC, confidence_score DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get personalized budget templates based on family composition and income
CREATE OR REPLACE FUNCTION get_budget_templates(
  family_id_param UUID,
  monthly_income_param DECIMAL(12,2)
)
RETURNS TABLE (
  template_name VARCHAR,
  template_description TEXT,
  category_allocations JSONB,
  suitability_score DECIMAL(3,2),
  pros_cons JSONB
) AS $$
DECLARE
  family_member_count INTEGER;
  has_children BOOLEAN;
BEGIN
  -- Get family composition
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE role = 'child') > 0
  INTO family_member_count, has_children
  FROM family_members 
  WHERE family_id = family_id_param;

  RETURN QUERY
  SELECT 
    template.name::VARCHAR,
    template.description::TEXT,
    template.allocations,
    template.score::DECIMAL,
    template.pros_cons
  FROM (
    VALUES 
    -- 50/30/20 Rule
    (
      '50/30/20 Rule',
      'A balanced approach: 50% for needs, 30% for wants, 20% for savings and debt repayment.',
      jsonb_build_object(
        'Housing', monthly_income_param * 0.25,
        'Food', monthly_income_param * 0.12,
        'Transportation', monthly_income_param * 0.10,
        'Utilities', monthly_income_param * 0.08,
        'Entertainment', monthly_income_param * 0.15,
        'Personal Care', monthly_income_param * 0.05,
        'Shopping', monthly_income_param * 0.10,
        'Savings', monthly_income_param * 0.15,
        'Emergency Fund', monthly_income_param * 0.05
      ),
      CASE 
        WHEN monthly_income_param > 3000 AND family_member_count <= 4 THEN 0.90
        WHEN monthly_income_param > 2000 THEN 0.80
        ELSE 0.70
      END,
      jsonb_build_object(
        'pros', jsonb_build_array('Simple to follow', 'Balanced approach', 'Good for beginners'),
        'cons', jsonb_build_array('May not fit all situations', 'Requires disciplined spending')
      )
    ),
    -- Zero-Based Budget
    (
      'Zero-Based Budget',
      'Every dollar has a purpose. Income minus all planned expenses and savings equals zero.',
      jsonb_build_object(
        'Housing', monthly_income_param * 0.28,
        'Food', monthly_income_param * 0.15,
        'Transportation', monthly_income_param * 0.12,
        'Utilities', monthly_income_param * 0.08,
        'Insurance', monthly_income_param * 0.06,
        'Entertainment', monthly_income_param * 0.08,
        'Personal Care', monthly_income_param * 0.03,
        'Savings', monthly_income_param * 0.15,
        'Emergency Fund', monthly_income_param * 0.05
      ),
      CASE 
        WHEN family_member_count > 2 THEN 0.95
        ELSE 0.85
      END,
      jsonb_build_object(
        'pros', jsonb_build_array('Maximum control', 'No wasted money', 'Great for debt payoff'),
        'cons', jsonb_build_array('Time-intensive', 'Requires detailed tracking', 'Less flexibility')
      )
    ),
    -- Family-Focused Budget
    (
      'Family-Focused Budget',
      'Optimized for families with children, emphasizing education, healthcare, and family activities.',
      jsonb_build_object(
        'Housing', monthly_income_param * 0.30,
        'Food', monthly_income_param * 0.18,
        'Transportation', monthly_income_param * 0.12,
        'Utilities', monthly_income_param * 0.08,
        'Healthcare', monthly_income_param * 0.08,
        'Education', monthly_income_param * 0.06,
        'Family Activities', monthly_income_param * 0.05,
        'Savings', monthly_income_param * 0.10,
        'Emergency Fund', monthly_income_param * 0.03
      ),
      CASE 
        WHEN has_children AND family_member_count >= 3 THEN 0.95
        WHEN has_children THEN 0.85
        ELSE 0.60
      END,
      jsonb_build_object(
        'pros', jsonb_build_array('Child-focused', 'Emphasizes education', 'Family activities prioritized'),
        'cons', jsonb_build_array('Lower savings rate', 'May not work for small families', 'Higher living expenses')
      )
    )
  ) AS template(name, description, allocations, score, pros_cons)
  WHERE template.score > 0.60
  ORDER BY template.score DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to track budget performance and provide insights
CREATE OR REPLACE FUNCTION get_budget_performance(
  family_id_param UUID,
  budget_data JSONB, -- Expected budget allocations
  start_date_param DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date_param DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  category_name VARCHAR,
  budgeted_amount DECIMAL(12,2),
  actual_spent DECIMAL(12,2),
  variance DECIMAL(12,2),
  variance_percentage DECIMAL(5,2),
  performance_status VARCHAR,
  recommendation TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH actual_spending AS (
    SELECT 
      tc.name as category_name,
      COALESCE(SUM(t.amount), 0) as actual_amount
    FROM transaction_categories tc
    LEFT JOIN transactions t ON tc.id = t.category_id 
      AND t.family_id = family_id_param
      AND t.type = 'expense'
      AND t.date >= start_date_param 
      AND t.date <= end_date_param
    WHERE tc.family_id = family_id_param
    GROUP BY tc.name
  ),
  budget_vs_actual AS (
    SELECT 
      budget_key as category_name,
      (budget_value->>0)::DECIMAL as budgeted_amount,
      COALESCE(asp.actual_amount, 0) as actual_spent
    FROM jsonb_each(budget_data) AS budget_item(budget_key, budget_value)
    LEFT JOIN actual_spending asp ON asp.category_name = budget_key
  )
  SELECT 
    bva.category_name::VARCHAR,
    bva.budgeted_amount,
    bva.actual_spent,
    (bva.actual_spent - bva.budgeted_amount) as variance,
    CASE 
      WHEN bva.budgeted_amount > 0 THEN 
        ROUND(((bva.actual_spent - bva.budgeted_amount) / bva.budgeted_amount * 100)::DECIMAL, 2)
      ELSE 0
    END as variance_percentage,
    CASE 
      WHEN bva.actual_spent <= bva.budgeted_amount * 0.95 THEN 'Under Budget'::VARCHAR
      WHEN bva.actual_spent <= bva.budgeted_amount * 1.05 THEN 'On Track'::VARCHAR
      WHEN bva.actual_spent <= bva.budgeted_amount * 1.15 THEN 'Slightly Over'::VARCHAR
      ELSE 'Over Budget'::VARCHAR
    END as performance_status,
    CASE 
      WHEN bva.actual_spent > bva.budgeted_amount * 1.15 THEN 
        'Consider reducing spending in this category or adjusting your budget allocation.'
      WHEN bva.actual_spent <= bva.budgeted_amount * 0.85 THEN 
        'Great job staying under budget! Consider reallocating some funds to savings or other priorities.'
      WHEN bva.actual_spent <= bva.budgeted_amount * 1.05 THEN
        'You''re doing well staying on track with your budget in this category.'
      ELSE 
        'Monitor this category closely to avoid further overspending.'
    END::TEXT as recommendation
  FROM budget_vs_actual bva
  ORDER BY ABS(bva.actual_spent - bva.budgeted_amount) DESC;
END;
$$ LANGUAGE plpgsql;