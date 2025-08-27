-- Create analytics and reporting tables for Family Hub application

-- Financial insights and metrics aggregation table
CREATE TABLE financial_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  
  -- Time period for this insight
  period_type VARCHAR NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Aggregate metrics
  total_income DECIMAL(12,2) DEFAULT 0.00,
  total_expenses DECIMAL(12,2) DEFAULT 0.00,
  net_income DECIMAL(12,2) GENERATED ALWAYS AS (total_income - total_expenses) STORED,
  transaction_count INTEGER DEFAULT 0,
  
  -- Category breakdowns (stored as JSONB for flexibility)
  income_by_category JSONB DEFAULT '{}'::jsonb,
  expenses_by_category JSONB DEFAULT '{}'::jsonb,
  
  -- Account balances snapshot
  account_balances JSONB DEFAULT '{}'::jsonb,
  
  -- Budget performance
  budget_performance JSONB DEFAULT '{}'::jsonb,
  
  -- Trends and comparisons
  income_trend DECIMAL(5,2) DEFAULT 0.00, -- Percentage change from previous period
  expense_trend DECIMAL(5,2) DEFAULT 0.00, -- Percentage change from previous period
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(family_id, period_type, period_start)
);

-- User activity and engagement metrics
CREATE TABLE user_activity_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Date for this metric
  activity_date DATE NOT NULL,
  
  -- Activity counters
  transactions_created INTEGER DEFAULT 0,
  accounts_created INTEGER DEFAULT 0,
  budgets_created INTEGER DEFAULT 0,
  login_count INTEGER DEFAULT 0,
  
  -- Time spent (in seconds)
  time_spent_seconds INTEGER DEFAULT 0,
  
  -- Last activity timestamp
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(family_id, user_id, activity_date)
);

-- Saved reports and custom analytics
CREATE TABLE saved_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Report metadata
  name VARCHAR NOT NULL,
  description TEXT,
  report_type VARCHAR NOT NULL CHECK (report_type IN ('income_expense', 'budget_analysis', 'category_breakdown', 'trends', 'custom')),
  
  -- Report configuration
  config JSONB NOT NULL DEFAULT '{}'::jsonb, -- Stores filters, date ranges, etc.
  
  -- Scheduling options
  is_scheduled BOOLEAN DEFAULT false,
  schedule_frequency VARCHAR CHECK (schedule_frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  next_run_at TIMESTAMPTZ,
  
  -- Export options
  auto_export BOOLEAN DEFAULT false,
  export_formats VARCHAR[] DEFAULT ARRAY['pdf'],
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report execution history
CREATE TABLE report_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID REFERENCES saved_reports(id) ON DELETE CASCADE,
  executed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Execution details
  status VARCHAR NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  execution_time_ms INTEGER,
  
  -- Result data
  result_data JSONB,
  error_message TEXT,
  
  -- Export information
  exported_files JSONB DEFAULT '[]'::jsonb, -- Array of file paths/URLs
  
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Family-wide analytics preferences
CREATE TABLE analytics_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  
  -- Dashboard preferences
  default_date_range VARCHAR DEFAULT 'last_30_days' CHECK (default_date_range IN ('last_7_days', 'last_30_days', 'last_90_days', 'last_year', 'current_month', 'current_year')),
  
  -- Visualization preferences
  preferred_chart_types JSONB DEFAULT '{
    "income_expense": "bar",
    "category_breakdown": "pie",
    "trends": "line",
    "budget_progress": "progress"
  }'::jsonb,
  
  -- Currency and formatting
  currency_display VARCHAR(3) DEFAULT 'USD',
  number_format VARCHAR DEFAULT 'en-US',
  
  -- Notification preferences
  enable_insights BOOLEAN DEFAULT true,
  enable_budget_alerts BOOLEAN DEFAULT true,
  enable_trend_alerts BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(family_id)
);

-- Indexes for performance optimization
CREATE INDEX idx_financial_insights_family_id ON financial_insights(family_id);
CREATE INDEX idx_financial_insights_period ON financial_insights(period_type, period_start, period_end);
CREATE INDEX idx_financial_insights_period_start ON financial_insights(period_start);

CREATE INDEX idx_user_activity_metrics_family_id ON user_activity_metrics(family_id);
CREATE INDEX idx_user_activity_metrics_user_id ON user_activity_metrics(user_id);
CREATE INDEX idx_user_activity_metrics_date ON user_activity_metrics(activity_date);

CREATE INDEX idx_saved_reports_family_id ON saved_reports(family_id);
CREATE INDEX idx_saved_reports_created_by ON saved_reports(created_by);
CREATE INDEX idx_saved_reports_type ON saved_reports(report_type);
CREATE INDEX idx_saved_reports_scheduled ON saved_reports(is_scheduled, next_run_at);

CREATE INDEX idx_report_executions_report_id ON report_executions(report_id);
CREATE INDEX idx_report_executions_status ON report_executions(status);
CREATE INDEX idx_report_executions_executed_at ON report_executions(executed_at);

-- Update triggers
CREATE TRIGGER update_financial_insights_updated_at 
  BEFORE UPDATE ON financial_insights 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_user_activity_metrics_updated_at 
  BEFORE UPDATE ON user_activity_metrics 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_saved_reports_updated_at 
  BEFORE UPDATE ON saved_reports 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_analytics_preferences_updated_at 
  BEFORE UPDATE ON analytics_preferences 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Function to aggregate financial insights for a family and period
CREATE OR REPLACE FUNCTION calculate_financial_insights(
  family_id_param UUID,
  period_type_param VARCHAR,
  period_start_param DATE,
  period_end_param DATE
) RETURNS VOID AS $$
DECLARE
  insight_record financial_insights%ROWTYPE;
  income_categories JSONB := '{}'::jsonb;
  expense_categories JSONB := '{}'::jsonb;
  account_balances JSONB := '{}'::jsonb;
  budget_performance JSONB := '{}'::jsonb;
BEGIN
  -- Calculate basic aggregates
  SELECT
    COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as total_income,
    COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as total_expenses,
    COUNT(*) as transaction_count
  INTO
    insight_record.total_income,
    insight_record.total_expenses,
    insight_record.transaction_count
  FROM transactions t
  WHERE t.family_id = family_id_param
    AND t.date >= period_start_param
    AND t.date <= period_end_param;

  -- Calculate income by category
  SELECT jsonb_object_agg(tc.name, category_totals.total_amount)
  INTO income_categories
  FROM (
    SELECT 
      t.category_id,
      SUM(t.amount) as total_amount
    FROM transactions t
    WHERE t.family_id = family_id_param
      AND t.type = 'income'
      AND t.date >= period_start_param
      AND t.date <= period_end_param
      AND t.category_id IS NOT NULL
    GROUP BY t.category_id
  ) category_totals
  JOIN transaction_categories tc ON tc.id = category_totals.category_id;

  -- Calculate expenses by category
  SELECT jsonb_object_agg(tc.name, category_totals.total_amount)
  INTO expense_categories
  FROM (
    SELECT 
      t.category_id,
      SUM(t.amount) as total_amount
    FROM transactions t
    WHERE t.family_id = family_id_param
      AND t.type = 'expense'
      AND t.date >= period_start_param
      AND t.date <= period_end_param
      AND t.category_id IS NOT NULL
    GROUP BY t.category_id
  ) category_totals
  JOIN transaction_categories tc ON tc.id = category_totals.category_id;

  -- Get current account balances
  SELECT jsonb_object_agg(fa.name, fa.balance)
  INTO account_balances
  FROM financial_accounts fa
  WHERE fa.family_id = family_id_param
    AND fa.is_active = true;

  -- Insert or update the insight record
  INSERT INTO financial_insights (
    family_id, period_type, period_start, period_end,
    total_income, total_expenses, transaction_count,
    income_by_category, expenses_by_category, account_balances, budget_performance
  ) VALUES (
    family_id_param, period_type_param, period_start_param, period_end_param,
    insight_record.total_income, insight_record.total_expenses, insight_record.transaction_count,
    COALESCE(income_categories, '{}'::jsonb),
    COALESCE(expense_categories, '{}'::jsonb),
    COALESCE(account_balances, '{}'::jsonb),
    COALESCE(budget_performance, '{}'::jsonb)
  )
  ON CONFLICT (family_id, period_type, period_start)
  DO UPDATE SET
    total_income = EXCLUDED.total_income,
    total_expenses = EXCLUDED.total_expenses,
    transaction_count = EXCLUDED.transaction_count,
    income_by_category = EXCLUDED.income_by_category,
    expenses_by_category = EXCLUDED.expenses_by_category,
    account_balances = EXCLUDED.account_balances,
    budget_performance = EXCLUDED.budget_performance,
    updated_at = NOW();
    
END;
$$ language 'plpgsql';

-- Function to create default analytics preferences for new families
CREATE OR REPLACE FUNCTION create_default_analytics_preferences_for_family(family_id_param UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO analytics_preferences (family_id)
  VALUES (family_id_param)
  ON CONFLICT (family_id) DO NOTHING;
END;
$$ language 'plpgsql';

-- Function to track user activity
CREATE OR REPLACE FUNCTION track_user_activity(
  family_id_param UUID,
  user_id_param UUID,
  activity_type VARCHAR,
  activity_date_param DATE DEFAULT CURRENT_DATE
) RETURNS VOID AS $$
BEGIN
  INSERT INTO user_activity_metrics (family_id, user_id, activity_date)
  VALUES (family_id_param, user_id_param, activity_date_param)
  ON CONFLICT (family_id, user_id, activity_date)
  DO UPDATE SET
    transactions_created = CASE 
      WHEN activity_type = 'transaction' THEN user_activity_metrics.transactions_created + 1
      ELSE user_activity_metrics.transactions_created
    END,
    accounts_created = CASE 
      WHEN activity_type = 'account' THEN user_activity_metrics.accounts_created + 1
      ELSE user_activity_metrics.accounts_created
    END,
    budgets_created = CASE 
      WHEN activity_type = 'budget' THEN user_activity_metrics.budgets_created + 1
      ELSE user_activity_metrics.budgets_created
    END,
    login_count = CASE 
      WHEN activity_type = 'login' THEN user_activity_metrics.login_count + 1
      ELSE user_activity_metrics.login_count
    END,
    last_activity_at = NOW(),
    updated_at = NOW();
END;
$$ language 'plpgsql';