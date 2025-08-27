-- Fix mode() function compatibility and type issues

-- Drop and recreate the functions with mode() function fix
DROP FUNCTION IF EXISTS get_family_spending_patterns(UUID, DATE, DATE);

-- Function to get family member spending patterns (FIXED AGAIN)
CREATE OR REPLACE FUNCTION get_family_spending_patterns(
  family_id_param UUID,
  start_date_param DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date_param DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  user_id UUID,
  full_name VARCHAR,
  role VARCHAR,
  total_expenses DECIMAL(12,2),
  total_income DECIMAL(12,2),
  transaction_count INTEGER,
  avg_transaction_amount DECIMAL(12,2),
  most_used_category VARCHAR,
  spending_trend DECIMAL(5,2), -- Percentage change from previous period
  category_breakdown JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH member_transactions AS (
    SELECT 
      fm.user_id,
      p.full_name,
      fm.role,
      t.type,
      t.amount,
      tc.name as category_name,
      COUNT(*) OVER (PARTITION BY fm.user_id) as transaction_count,
      AVG(t.amount) OVER (PARTITION BY fm.user_id) as avg_amount
    FROM family_members fm
    JOIN profiles p ON p.id = fm.user_id
    LEFT JOIN transactions t ON t.created_by = fm.user_id 
      AND t.family_id = family_id_param
      AND t.date >= start_date_param 
      AND t.date <= end_date_param
    LEFT JOIN transaction_categories tc ON tc.id = t.category_id
    WHERE fm.family_id = family_id_param
  ),
  member_totals AS (
    SELECT 
      mt.user_id,
      mt.full_name,
      mt.role,
      COALESCE(SUM(CASE WHEN mt.type = 'expense' THEN mt.amount END), 0) as total_expenses,
      COALESCE(SUM(CASE WHEN mt.type = 'income' THEN mt.amount END), 0) as total_income,
      COALESCE(MAX(mt.transaction_count), 0) as transaction_count,
      COALESCE(MAX(mt.avg_amount), 0) as avg_transaction_amount
    FROM member_transactions mt
    GROUP BY mt.user_id, mt.full_name, mt.role
  ),
  member_category_sums AS (
    SELECT 
      mt.user_id,
      COALESCE(mt.category_name, 'Uncategorized') as category_name,
      SUM(mt.amount) as category_total,
      COUNT(*) as category_count
    FROM member_transactions mt
    WHERE mt.type = 'expense' -- Focus on expense categories for insights
      AND mt.category_name IS NOT NULL
      AND mt.amount IS NOT NULL
    GROUP BY mt.user_id, mt.category_name
  ),
  member_top_categories AS (
    SELECT 
      mcs.user_id,
      mcs.category_name as most_used_category,
      ROW_NUMBER() OVER (PARTITION BY mcs.user_id ORDER BY mcs.category_total DESC) as rn
    FROM member_category_sums mcs
  ),
  member_categories AS (
    SELECT 
      mcs.user_id,
      COALESCE(
        (SELECT mtc.most_used_category FROM member_top_categories mtc 
         WHERE mtc.user_id = mcs.user_id AND mtc.rn = 1),
        'None'
      ) as most_used_category,
      jsonb_object_agg(mcs.category_name, mcs.category_total) as category_breakdown
    FROM member_category_sums mcs
    GROUP BY mcs.user_id
  ),
  previous_period AS (
    SELECT 
      fm.user_id,
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount END), 0) as prev_expenses
    FROM family_members fm
    LEFT JOIN transactions t ON t.created_by = fm.user_id 
      AND t.family_id = family_id_param
      AND t.date >= (start_date_param - (end_date_param - start_date_param))
      AND t.date < start_date_param
    WHERE fm.family_id = family_id_param
    GROUP BY fm.user_id
  )
  SELECT 
    mt.user_id,
    mt.full_name,
    mt.role,
    mt.total_expenses,
    mt.total_income,
    mt.transaction_count,
    mt.avg_transaction_amount,
    COALESCE(mc.most_used_category, 'None') as most_used_category,
    CASE 
      WHEN pp.prev_expenses > 0 THEN 
        ROUND(((mt.total_expenses - pp.prev_expenses) / pp.prev_expenses * 100)::DECIMAL, 2)
      ELSE 0 
    END as spending_trend,
    COALESCE(mc.category_breakdown, '{}'::jsonb) as category_breakdown
  FROM member_totals mt
  LEFT JOIN member_categories mc ON mc.user_id = mt.user_id
  LEFT JOIN previous_period pp ON pp.user_id = mt.user_id
  ORDER BY mt.total_expenses DESC;
END;
$$ LANGUAGE plpgsql;