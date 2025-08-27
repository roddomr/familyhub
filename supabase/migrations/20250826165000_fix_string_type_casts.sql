-- Fix string type mismatches by adding explicit VARCHAR casts

-- Drop and recreate get_family_spending_comparison with VARCHAR casts
DROP FUNCTION IF EXISTS get_family_spending_comparison(UUID, DATE, DATE);

CREATE OR REPLACE FUNCTION get_family_spending_comparison(
  family_id_param UUID,
  start_date_param DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date_param DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  comparison_metric VARCHAR,
  member_name VARCHAR,
  member_role VARCHAR,
  value DECIMAL(12,2),
  rank_position BIGINT,
  percentage_of_family_total DECIMAL(5,2)
) AS $$
DECLARE
  family_total_expenses DECIMAL(12,2);
  family_total_transactions BIGINT;
BEGIN
  -- Get family totals for percentage calculations
  SELECT 
    COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount END), 0),
    COUNT(*)
  INTO family_total_expenses, family_total_transactions
  FROM transactions t
  JOIN family_members fm ON fm.user_id = t.created_by
  WHERE fm.family_id = family_id_param 
    AND t.date >= start_date_param 
    AND t.date <= end_date_param;

  RETURN QUERY
  -- Total spending ranking
  WITH expense_ranking AS (
    SELECT 
      'total_expenses'::VARCHAR as comparison_metric, -- Explicit VARCHAR cast
      p.full_name::VARCHAR as member_name, -- Explicit VARCHAR cast
      fm.role::VARCHAR as member_role, -- Explicit VARCHAR cast
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount END), 0) as value,
      ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount END), 0) DESC) as rank_position
    FROM family_members fm
    JOIN profiles p ON p.id = fm.user_id
    LEFT JOIN transactions t ON t.created_by = fm.user_id 
      AND t.date >= start_date_param 
      AND t.date <= end_date_param
    WHERE fm.family_id = family_id_param
    GROUP BY fm.user_id, p.full_name, fm.role
  ),
  transaction_count_ranking AS (
    SELECT 
      'transaction_count'::VARCHAR as comparison_metric, -- Explicit VARCHAR cast
      p.full_name::VARCHAR as member_name, -- Explicit VARCHAR cast
      fm.role::VARCHAR as member_role, -- Explicit VARCHAR cast
      COUNT(t.id)::DECIMAL as value,
      ROW_NUMBER() OVER (ORDER BY COUNT(t.id) DESC) as rank_position
    FROM family_members fm
    JOIN profiles p ON p.id = fm.user_id
    LEFT JOIN transactions t ON t.created_by = fm.user_id 
      AND t.date >= start_date_param 
      AND t.date <= end_date_param
    WHERE fm.family_id = family_id_param
    GROUP BY fm.user_id, p.full_name, fm.role
  ),
  avg_transaction_ranking AS (
    SELECT 
      'avg_transaction_amount'::VARCHAR as comparison_metric, -- Explicit VARCHAR cast
      p.full_name::VARCHAR as member_name, -- Explicit VARCHAR cast
      fm.role::VARCHAR as member_role, -- Explicit VARCHAR cast
      COALESCE(AVG(t.amount), 0) as value,
      ROW_NUMBER() OVER (ORDER BY COALESCE(AVG(t.amount), 0) DESC) as rank_position
    FROM family_members fm
    JOIN profiles p ON p.id = fm.user_id
    LEFT JOIN transactions t ON t.created_by = fm.user_id 
      AND t.date >= start_date_param 
      AND t.date <= end_date_param
    WHERE fm.family_id = family_id_param
    GROUP BY fm.user_id, p.full_name, fm.role
  )
  SELECT 
    er.comparison_metric,
    er.member_name,
    er.member_role,
    er.value,
    er.rank_position,
    CASE WHEN family_total_expenses > 0 THEN ROUND((er.value / family_total_expenses * 100)::DECIMAL, 2) ELSE 0 END as percentage_of_family_total
  FROM expense_ranking er
  
  UNION ALL
  
  SELECT 
    tcr.comparison_metric,
    tcr.member_name,
    tcr.member_role,
    tcr.value,
    tcr.rank_position,
    CASE WHEN family_total_transactions > 0 THEN ROUND((tcr.value / family_total_transactions * 100)::DECIMAL, 2) ELSE 0 END as percentage_of_family_total
  FROM transaction_count_ranking tcr
  
  UNION ALL
  
  SELECT 
    atr.comparison_metric,
    atr.member_name,
    atr.member_role,
    atr.value,
    atr.rank_position,
    -- For average amounts, percentage doesn't make sense in the same way, so we'll use relative percentage
    CASE WHEN (SELECT MAX(value) FROM avg_transaction_ranking) > 0 THEN 
      ROUND((atr.value / (SELECT MAX(value) FROM avg_transaction_ranking) * 100)::DECIMAL, 2) 
    ELSE 0 END as percentage_of_family_total
  FROM avg_transaction_ranking atr
  
  ORDER BY comparison_metric, rank_position;
END;
$$ LANGUAGE plpgsql;

-- Also fix get_shared_vs_individual_expenses with VARCHAR casts
DROP FUNCTION IF EXISTS get_shared_vs_individual_expenses(UUID, DATE, DATE);

CREATE OR REPLACE FUNCTION get_shared_vs_individual_expenses(
  family_id_param UUID,
  start_date_param DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date_param DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  analysis_type VARCHAR,
  total_amount DECIMAL(12,2),
  transaction_count BIGINT,
  avg_amount DECIMAL(12,2),
  percentage_of_total DECIMAL(5,2),
  top_categories JSONB
) AS $$
DECLARE
  total_expenses DECIMAL(12,2);
BEGIN
  -- Calculate total expenses for percentage calculations
  SELECT COALESCE(SUM(amount), 0) INTO total_expenses
  FROM transactions t
  WHERE t.family_id = family_id_param 
    AND t.type = 'expense'
    AND t.date >= start_date_param 
    AND t.date <= end_date_param;

  RETURN QUERY
  WITH shared_categories AS (
    -- Categories typically considered shared (household expenses)
    SELECT DISTINCT tc.id as category_id, tc.name
    FROM transaction_categories tc
    WHERE tc.family_id = family_id_param
      AND tc.name IN ('Groceries', 'Utilities', 'Home', 'Transportation')
  ),
  shared_category_sums AS (
    SELECT 
      tc.name as category_name,
      SUM(t.amount) as category_total
    FROM transactions t
    JOIN transaction_categories tc ON tc.id = t.category_id
    JOIN shared_categories sc ON sc.category_id = t.category_id
    WHERE t.family_id = family_id_param 
      AND t.type = 'expense'
      AND t.date >= start_date_param 
      AND t.date <= end_date_param
    GROUP BY tc.name
  ),
  shared_expenses AS (
    SELECT 
      'shared'::VARCHAR as analysis_type, -- Explicit VARCHAR cast
      COALESCE(SUM(t.amount), 0) as total_amount,
      COUNT(*) as transaction_count,
      COALESCE(AVG(t.amount), 0) as avg_amount,
      COALESCE(
        (SELECT jsonb_object_agg(scs.category_name, scs.category_total) FROM shared_category_sums scs),
        '{}'::jsonb
      ) as top_categories
    FROM transactions t
    JOIN transaction_categories tc ON tc.id = t.category_id
    JOIN shared_categories sc ON sc.category_id = t.category_id
    WHERE t.family_id = family_id_param 
      AND t.type = 'expense'
      AND t.date >= start_date_param 
      AND t.date <= end_date_param
  ),
  individual_category_sums AS (
    SELECT 
      tc.name as category_name,
      SUM(t.amount) as category_total
    FROM transactions t
    JOIN transaction_categories tc ON tc.id = t.category_id
    LEFT JOIN shared_categories sc ON sc.category_id = t.category_id
    WHERE t.family_id = family_id_param 
      AND t.type = 'expense'
      AND t.date >= start_date_param 
      AND t.date <= end_date_param
      AND sc.category_id IS NULL -- Not in shared categories
    GROUP BY tc.name
  ),
  individual_expenses AS (
    SELECT 
      'individual'::VARCHAR as analysis_type, -- Explicit VARCHAR cast
      COALESCE(SUM(t.amount), 0) as total_amount,
      COUNT(*) as transaction_count,
      COALESCE(AVG(t.amount), 0) as avg_amount,
      COALESCE(
        (SELECT jsonb_object_agg(ics.category_name, ics.category_total) FROM individual_category_sums ics),
        '{}'::jsonb
      ) as top_categories
    FROM transactions t
    JOIN transaction_categories tc ON tc.id = t.category_id
    LEFT JOIN shared_categories sc ON sc.category_id = t.category_id
    WHERE t.family_id = family_id_param 
      AND t.type = 'expense'
      AND t.date >= start_date_param 
      AND t.date <= end_date_param
      AND sc.category_id IS NULL -- Not in shared categories
  )
  SELECT 
    se.analysis_type,
    se.total_amount,
    se.transaction_count,
    se.avg_amount,
    CASE WHEN total_expenses > 0 THEN ROUND((se.total_amount / total_expenses * 100)::DECIMAL, 2) ELSE 0 END,
    se.top_categories
  FROM shared_expenses se
  
  UNION ALL
  
  SELECT 
    ie.analysis_type,
    ie.total_amount,
    ie.transaction_count,
    ie.avg_amount,
    CASE WHEN total_expenses > 0 THEN ROUND((ie.total_amount / total_expenses * 100)::DECIMAL, 2) ELSE 0 END,
    ie.top_categories
  FROM individual_expenses ie;
END;
$$ LANGUAGE plpgsql;

-- Also fix get_family_spending_patterns with VARCHAR casts
DROP FUNCTION IF EXISTS get_family_spending_patterns(UUID, DATE, DATE);

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
  transaction_count BIGINT,
  avg_transaction_amount DECIMAL(12,2),
  most_used_category VARCHAR,
  spending_trend DECIMAL(5,2),
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
      mt.full_name::VARCHAR, -- Explicit VARCHAR cast
      mt.role::VARCHAR, -- Explicit VARCHAR cast
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
    WHERE mt.type = 'expense'
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
      )::VARCHAR as most_used_category, -- Explicit VARCHAR cast
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
    COALESCE(mc.most_used_category, 'None'::VARCHAR) as most_used_category, -- Explicit VARCHAR cast
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

-- Also fix get_family_financial_health_insights with VARCHAR casts
DROP FUNCTION IF EXISTS get_family_financial_health_insights(UUID, DATE, DATE);

CREATE OR REPLACE FUNCTION get_family_financial_health_insights(
  family_id_param UUID,
  start_date_param DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date_param DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  insight_type VARCHAR,
  insight_title VARCHAR,
  insight_description TEXT,
  impact_level VARCHAR,
  recommended_action TEXT,
  supporting_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH family_metrics AS (
    SELECT 
      COUNT(DISTINCT fm.user_id) as member_count,
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount END), 0) as total_income,
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount END), 0) as total_expenses,
      COUNT(t.id) as total_transactions
    FROM family_members fm
    LEFT JOIN transactions t ON t.created_by = fm.user_id 
      AND t.date >= start_date_param 
      AND t.date <= end_date_param
    WHERE fm.family_id = family_id_param
  ),
  spending_inequality AS (
    SELECT 
      STDDEV(member_expenses) as expense_std_dev,
      AVG(member_expenses) as avg_member_expenses,
      MAX(member_expenses) as max_member_expenses,
      MIN(member_expenses) as min_member_expenses
    FROM (
      SELECT 
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount END), 0) as member_expenses
      FROM family_members fm
      LEFT JOIN transactions t ON t.created_by = fm.user_id 
        AND t.date >= start_date_param 
        AND t.date <= end_date_param
      WHERE fm.family_id = family_id_param
      GROUP BY fm.user_id
    ) member_spending
  )
  SELECT 
    'savings_rate'::VARCHAR as insight_type, -- Explicit VARCHAR cast
    'Family Savings Rate'::VARCHAR as insight_title, -- Explicit VARCHAR cast
    CASE 
      WHEN fm.total_income > 0 THEN
        CASE 
          WHEN (fm.total_income - fm.total_expenses) / fm.total_income > 0.20 THEN
            'Excellent! Your family is saving over 20% of income, which puts you in a strong financial position.'
          WHEN (fm.total_income - fm.total_expenses) / fm.total_income > 0.10 THEN
            'Good job! Your family is saving over 10% of income. Consider increasing to 20% for better financial security.'
          WHEN (fm.total_income - fm.total_expenses) / fm.total_income > 0 THEN
            'Your family is saving money, but the rate is below 10%. Try to reduce expenses or increase income.'
          ELSE
            'Alert: Your family is spending more than earning. Immediate action needed to reduce expenses or increase income.'
        END
      ELSE 'Unable to calculate savings rate - no income recorded for this period.'
    END::TEXT as insight_description, -- Explicit TEXT cast
    CASE 
      WHEN fm.total_income > 0 THEN
        CASE 
          WHEN (fm.total_income - fm.total_expenses) / fm.total_income < 0 THEN 'high'::VARCHAR
          WHEN (fm.total_income - fm.total_expenses) / fm.total_income < 0.10 THEN 'medium'::VARCHAR
          ELSE 'low'::VARCHAR
        END
      ELSE 'high'::VARCHAR
    END as impact_level, -- Explicit VARCHAR cast
    CASE 
      WHEN fm.total_income > 0 THEN
        CASE 
          WHEN (fm.total_income - fm.total_expenses) / fm.total_income < 0 THEN
            'Review all expenses immediately. Consider emergency budget cuts and look for additional income sources.'
          WHEN (fm.total_income - fm.total_expenses) / fm.total_income < 0.10 THEN
            'Set up automatic transfers to savings. Look for recurring expenses that can be reduced.'
          ELSE
            'Consider increasing savings target to 20% and explore investment opportunities.'
        END
      ELSE 'Start tracking all family income sources to get better financial insights.'
    END::TEXT as recommended_action, -- Explicit TEXT cast
    jsonb_build_object(
      'total_income', fm.total_income,
      'total_expenses', fm.total_expenses,
      'net_amount', (fm.total_income - fm.total_expenses),
      'savings_rate_percent', 
        CASE WHEN fm.total_income > 0 THEN 
          ROUND(((fm.total_income - fm.total_expenses) / fm.total_income * 100)::DECIMAL, 2)
        ELSE 0 END
    ) as supporting_data
  FROM family_metrics fm;
END;
$$ LANGUAGE plpgsql;