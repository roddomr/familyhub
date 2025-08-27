-- Fix ROW_NUMBER() return types in comparison functions

-- Drop and recreate get_family_spending_comparison with correct ROW_NUMBER types
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
  rank_position BIGINT, -- Changed from INTEGER to BIGINT
  percentage_of_family_total DECIMAL(5,2)
) AS $$
DECLARE
  family_total_expenses DECIMAL(12,2);
  family_total_transactions BIGINT; -- Changed from INTEGER to BIGINT
BEGIN
  -- Get family totals for percentage calculations
  SELECT 
    COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount END), 0),
    COUNT(*) -- Removed ::INTEGER cast
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
      'total_expenses' as comparison_metric,
      p.full_name as member_name,
      fm.role as member_role,
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount END), 0) as value,
      ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount END), 0) DESC) as rank_position -- Removed ::INTEGER cast
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
      'transaction_count' as comparison_metric,
      p.full_name as member_name,
      fm.role as member_role,
      COUNT(t.id)::DECIMAL as value,
      ROW_NUMBER() OVER (ORDER BY COUNT(t.id) DESC) as rank_position -- Removed ::INTEGER cast
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
      'avg_transaction_amount' as comparison_metric,
      p.full_name as member_name,
      fm.role as member_role,
      COALESCE(AVG(t.amount), 0) as value,
      ROW_NUMBER() OVER (ORDER BY COALESCE(AVG(t.amount), 0) DESC) as rank_position -- Removed ::INTEGER cast
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