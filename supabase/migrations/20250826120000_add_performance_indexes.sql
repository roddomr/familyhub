-- Add comprehensive database indexes for better query performance
-- Migration: 20250826120000_add_performance_indexes.sql

-- =======================
-- TRANSACTION PERFORMANCE INDEXES
-- =======================

-- Composite index for transactions by family and date (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_transactions_family_date 
ON transactions(family_id, date DESC);

-- Composite index for transactions by family and created_at (for recent transactions)
CREATE INDEX IF NOT EXISTS idx_transactions_family_created_at 
ON transactions(family_id, created_at DESC);

-- Composite index for transactions by family, type and date (for income/expense filtering)
CREATE INDEX IF NOT EXISTS idx_transactions_family_type_date 
ON transactions(family_id, type, date DESC);

-- Composite index for monthly analysis queries
CREATE INDEX IF NOT EXISTS idx_transactions_family_date_type 
ON transactions(family_id, date, type);

-- Index for transaction search by description (for search functionality)
CREATE INDEX IF NOT EXISTS idx_transactions_description_search 
ON transactions USING gin(to_tsvector('english', description));

-- Additional index for recent transaction queries (without time predicate)
CREATE INDEX IF NOT EXISTS idx_transactions_recent 
ON transactions(family_id, created_at DESC);

-- =======================
-- ACCOUNT BALANCE INDEXES
-- =======================

-- Composite index for active accounts by family
CREATE INDEX IF NOT EXISTS idx_financial_accounts_family_active 
ON financial_accounts(family_id, is_active, created_at DESC) 
WHERE is_active = true;

-- Index for account balance calculations
CREATE INDEX IF NOT EXISTS idx_financial_accounts_balance 
ON financial_accounts(family_id, balance DESC) 
WHERE is_active = true;

-- =======================
-- CATEGORY AND BUDGET INDEXES  
-- =======================

-- Composite index for categories by family and type
CREATE INDEX IF NOT EXISTS idx_transaction_categories_family_type_name 
ON transaction_categories(family_id, type, name);

-- Composite index for active budgets by family
CREATE INDEX IF NOT EXISTS idx_budgets_family_active 
ON budgets(family_id, is_active, start_date DESC) 
WHERE is_active = true;

-- Index for budget period queries
CREATE INDEX IF NOT EXISTS idx_budgets_period_dates 
ON budgets(family_id, period, start_date, end_date) 
WHERE is_active = true;

-- =======================
-- LOGGING SYSTEM INDEXES
-- =======================

-- Composite index for user logs with level filtering
CREATE INDEX IF NOT EXISTS idx_logs_user_level_created 
ON logs(user_id, level, created_at DESC) 
WHERE user_id IS NOT NULL;

-- Partial index for error logs (most queried log level)
CREATE INDEX IF NOT EXISTS idx_logs_errors_recent 
ON logs(created_at DESC, user_id) 
WHERE level IN ('error', 'fatal');

-- Index for system monitoring queries
CREATE INDEX IF NOT EXISTS idx_logs_module_action_created 
ON logs(module, action, created_at DESC) 
WHERE module IS NOT NULL AND action IS NOT NULL;

-- Partial index for frontend logs
CREATE INDEX IF NOT EXISTS idx_logs_frontend_recent 
ON logs(user_id, created_at DESC) 
WHERE source = 'frontend';

-- =======================
-- FAMILY MEMBERSHIP INDEXES
-- =======================

-- Composite index for user family memberships (most common auth query)
CREATE INDEX IF NOT EXISTS idx_family_members_user_family 
ON family_members(user_id, family_id, role);

-- Index for family admin queries
CREATE INDEX IF NOT EXISTS idx_family_members_family_role 
ON family_members(family_id, role) 
WHERE role IN ('admin', 'parent');

-- =======================
-- PROFILE OPTIMIZATION INDEXES
-- =======================

-- Index for profile email lookups (if needed for auth)
CREATE INDEX IF NOT EXISTS idx_profiles_email 
ON profiles(email);

-- =======================
-- BUDGET SUMMARIES INDEXES
-- =======================

-- Composite index for budget summary queries
CREATE INDEX IF NOT EXISTS idx_budget_summaries_budget_year_month 
ON budget_summaries(budget_id, year, month);

-- Index for monthly budget analysis
CREATE INDEX IF NOT EXISTS idx_budget_summaries_year_month_budget 
ON budget_summaries(year, month, budget_id);

-- =======================
-- PERFORMANCE VIEWS
-- =======================

-- Create materialized view for monthly transaction summaries
CREATE MATERIALIZED VIEW IF NOT EXISTS monthly_transaction_summaries AS
SELECT 
  family_id,
  DATE_TRUNC('month', date) as month_year,
  type,
  COUNT(*) as transaction_count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount
FROM transactions 
WHERE date >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY family_id, DATE_TRUNC('month', date), type;

-- Index for the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_summaries_family_month_type 
ON monthly_transaction_summaries(family_id, month_year, type);

-- Create function to refresh monthly summaries
CREATE OR REPLACE FUNCTION refresh_monthly_summaries()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_transaction_summaries;
END;
$$ LANGUAGE plpgsql;

-- =======================
-- MAINTENANCE FUNCTIONS
-- =======================

-- Function to analyze index usage
CREATE OR REPLACE FUNCTION analyze_index_usage()
RETURNS TABLE(
  schemaname TEXT,
  tablename TEXT,
  indexname TEXT,
  idx_scan BIGINT,
  idx_tup_read BIGINT,
  idx_tup_fetch BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.schemaname::TEXT,
    s.tablename::TEXT,
    s.indexname::TEXT,
    s.idx_scan,
    s.idx_tup_read,
    s.idx_tup_fetch
  FROM pg_stat_user_indexes s
  JOIN pg_index i ON s.indexrelid = i.indexrelid
  WHERE s.schemaname = 'public'
  ORDER BY s.idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get table sizes
CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE(
  table_name TEXT,
  row_count BIGINT,
  total_size TEXT,
  index_size TEXT,
  table_size TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.table_name::TEXT,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = t.table_name)::BIGINT as row_count,
    pg_size_pretty(pg_total_relation_size(c.oid))::TEXT as total_size,
    pg_size_pretty(pg_indexes_size(c.oid))::TEXT as index_size,
    pg_size_pretty(pg_relation_size(c.oid))::TEXT as table_size
  FROM information_schema.tables t
  JOIN pg_class c ON c.relname = t.table_name
  WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
    AND c.relkind = 'r'
  ORDER BY pg_total_relation_size(c.oid) DESC;
END;
$$ LANGUAGE plpgsql;

-- =======================
-- AUTOMATIC MAINTENANCE
-- =======================

-- Schedule monthly summary refresh (requires pg_cron extension)
-- Uncomment if pg_cron is available:
-- SELECT cron.schedule('refresh-monthly-summaries', '0 2 1 * *', 'SELECT refresh_monthly_summaries();');

-- Add comments for documentation
COMMENT ON INDEX idx_transactions_family_date IS 'Optimizes queries filtering by family and ordering by date';
COMMENT ON INDEX idx_transactions_family_created_at IS 'Optimizes recent transactions queries';
COMMENT ON INDEX idx_transactions_family_type_date IS 'Optimizes income/expense filtering queries';
COMMENT ON INDEX idx_logs_user_level_created IS 'Optimizes user log queries with level filtering';
COMMENT ON INDEX idx_financial_accounts_family_active IS 'Optimizes active account queries';
COMMENT ON MATERIALIZED VIEW monthly_transaction_summaries IS 'Pre-computed monthly statistics for dashboard performance';

-- Create index maintenance log
CREATE TABLE IF NOT EXISTS index_maintenance_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  operation VARCHAR NOT NULL,
  index_name VARCHAR NOT NULL,
  table_name VARCHAR NOT NULL,
  status VARCHAR NOT NULL,
  execution_time INTERVAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);