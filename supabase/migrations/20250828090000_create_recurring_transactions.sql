-- Enhanced Recurring Transactions System for Family Hub
-- Creates comprehensive recurring transaction management

-- Table for recurring transaction templates
CREATE TABLE recurring_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  account_id UUID REFERENCES financial_accounts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES transaction_categories(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  
  -- Template details (same as regular transactions)
  description VARCHAR NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  type VARCHAR NOT NULL CHECK (type IN ('income', 'expense')),
  notes TEXT,
  
  -- Recurrence configuration
  frequency VARCHAR NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  interval_count INTEGER DEFAULT 1 CHECK (interval_count > 0), -- Every N periods
  start_date DATE NOT NULL,
  end_date DATE, -- Optional end date
  max_occurrences INTEGER, -- Optional max number of occurrences
  
  -- Weekly specific (if frequency = 'weekly')
  days_of_week INTEGER[] CHECK (array_length(days_of_week, 1) <= 7), -- 0=Sunday, 1=Monday, etc.
  
  -- Monthly specific (if frequency = 'monthly')
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31), -- Specific day of month
  week_of_month INTEGER CHECK (week_of_month BETWEEN 1 AND 5), -- 1st, 2nd, 3rd, 4th, or last week
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- Combined with week_of_month
  
  -- Status and metadata
  is_active BOOLEAN DEFAULT true,
  next_execution_date DATE NOT NULL,
  last_execution_date DATE,
  execution_count INTEGER DEFAULT 0,
  failed_execution_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_monthly_pattern CHECK (
    frequency != 'monthly' OR 
    (day_of_month IS NOT NULL AND week_of_month IS NULL AND day_of_week IS NULL) OR
    (day_of_month IS NULL AND week_of_month IS NOT NULL AND day_of_week IS NOT NULL)
  ),
  CONSTRAINT valid_weekly_pattern CHECK (
    frequency != 'weekly' OR days_of_week IS NOT NULL
  ),
  CONSTRAINT valid_end_conditions CHECK (
    end_date IS NOT NULL OR max_occurrences IS NOT NULL OR 
    (end_date IS NULL AND max_occurrences IS NULL)
  )
);

-- Table for tracking executed recurring transactions
CREATE TABLE recurring_transaction_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recurring_transaction_id UUID REFERENCES recurring_transactions(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  
  scheduled_date DATE NOT NULL,
  executed_date DATE,
  execution_status VARCHAR NOT NULL DEFAULT 'pending' CHECK (
    execution_status IN ('pending', 'completed', 'failed', 'skipped', 'cancelled')
  ),
  
  -- Error tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  next_retry_date TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(recurring_transaction_id, scheduled_date)
);

-- Function to calculate next execution date
CREATE OR REPLACE FUNCTION calculate_next_execution_date(
  p_current_date DATE,
  p_frequency VARCHAR,
  p_interval_count INTEGER,
  p_days_of_week INTEGER[],
  p_day_of_month INTEGER,
  p_week_of_month INTEGER,
  p_day_of_week INTEGER
) RETURNS DATE AS $$
DECLARE
  v_next_date DATE;
  v_target_day INTEGER;
  v_month_start DATE;
  v_week_start DATE;
BEGIN
  CASE p_frequency
    WHEN 'daily' THEN
      v_next_date := p_current_date + (p_interval_count || ' days')::INTERVAL;
      
    WHEN 'weekly' THEN
      -- Find next occurrence of any specified day of week
      v_next_date := p_current_date + INTERVAL '1 day';
      WHILE NOT (EXTRACT(DOW FROM v_next_date)::INTEGER = ANY(p_days_of_week)) LOOP
        v_next_date := v_next_date + INTERVAL '1 day';
        -- Skip to next interval period if we've gone through a full week
        IF v_next_date > p_current_date + INTERVAL '7 days' THEN
          v_next_date := p_current_date + (p_interval_count || ' weeks')::INTERVAL;
          EXIT;
        END IF;
      END LOOP;
      
    WHEN 'monthly' THEN
      IF p_day_of_month IS NOT NULL THEN
        -- Specific day of month
        v_next_date := (DATE_TRUNC('month', p_current_date) + (p_interval_count || ' months')::INTERVAL)::DATE;
        v_next_date := v_next_date + (p_day_of_month - 1 || ' days')::INTERVAL;
        
        -- Handle months with fewer days (e.g., Feb 30 -> Feb 28)
        IF EXTRACT(DAY FROM v_next_date) != p_day_of_month THEN
          v_next_date := (DATE_TRUNC('month', v_next_date) + INTERVAL '1 month - 1 day')::DATE;
        END IF;
      ELSE
        -- Specific week and day of month (e.g., 2nd Tuesday)
        v_month_start := (DATE_TRUNC('month', p_current_date) + (p_interval_count || ' months')::INTERVAL)::DATE;
        
        -- Find the first occurrence of the target day in the month
        v_week_start := v_month_start;
        WHILE EXTRACT(DOW FROM v_week_start)::INTEGER != p_day_of_week LOOP
          v_week_start := v_week_start + INTERVAL '1 day';
        END LOOP;
        
        -- Add weeks to get to the target week
        v_next_date := v_week_start + ((p_week_of_month - 1) * 7 || ' days')::INTERVAL;
        
        -- Handle "last week" of month (week 5)
        IF p_week_of_month = 5 AND EXTRACT(MONTH FROM v_next_date + INTERVAL '7 days') != EXTRACT(MONTH FROM v_next_date) THEN
          v_next_date := v_next_date; -- Already in last week
        ELSIF p_week_of_month = 5 THEN
          v_next_date := v_next_date + INTERVAL '7 days';
        END IF;
      END IF;
      
    WHEN 'quarterly' THEN
      v_next_date := (p_current_date + (p_interval_count * 3 || ' months')::INTERVAL)::DATE;
      
    WHEN 'yearly' THEN
      v_next_date := (p_current_date + (p_interval_count || ' years')::INTERVAL)::DATE;
      
    ELSE
      RAISE EXCEPTION 'Invalid frequency: %', p_frequency;
  END CASE;
  
  RETURN v_next_date;
END;
$$ LANGUAGE plpgsql;

-- Function to process pending recurring transactions
CREATE OR REPLACE FUNCTION process_recurring_transactions(p_process_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  processed_count INTEGER,
  failed_count INTEGER,
  error_messages TEXT[]
) AS $$
DECLARE
  v_recurring_transaction RECORD;
  v_transaction_id UUID;
  v_execution_id UUID;
  v_next_date DATE;
  v_processed_count INTEGER := 0;
  v_failed_count INTEGER := 0;
  v_error_messages TEXT[] := '{}';
  v_error_msg TEXT;
BEGIN
  -- Process all active recurring transactions that are due
  FOR v_recurring_transaction IN
    SELECT rt.*, fa.balance as account_balance
    FROM recurring_transactions rt
    JOIN financial_accounts fa ON rt.account_id = fa.id
    WHERE rt.is_active = true
      AND rt.next_execution_date <= p_process_date
      AND (rt.end_date IS NULL OR rt.next_execution_date <= rt.end_date)
      AND (rt.max_occurrences IS NULL OR rt.execution_count < rt.max_occurrences)
  LOOP
    BEGIN
      -- Create execution record
      INSERT INTO recurring_transaction_executions (
        recurring_transaction_id,
        scheduled_date,
        execution_status
      ) VALUES (
        v_recurring_transaction.id,
        v_recurring_transaction.next_execution_date,
        'pending'
      ) RETURNING id INTO v_execution_id;
      
      -- Check account balance for expenses
      IF v_recurring_transaction.type = 'expense' AND 
         v_recurring_transaction.account_balance < v_recurring_transaction.amount THEN
        -- Mark as failed due to insufficient funds
        UPDATE recurring_transaction_executions 
        SET execution_status = 'failed',
            error_message = 'Insufficient account balance',
            updated_at = NOW()
        WHERE id = v_execution_id;
        
        v_failed_count := v_failed_count + 1;
        v_error_messages := array_append(v_error_messages, 
          'Recurring transaction ' || v_recurring_transaction.id || ': Insufficient balance');
        CONTINUE;
      END IF;
      
      -- Create the actual transaction
      INSERT INTO transactions (
        family_id,
        account_id,
        category_id,
        created_by,
        description,
        amount,
        type,
        date,
        notes,
        is_recurring
      ) VALUES (
        v_recurring_transaction.family_id,
        v_recurring_transaction.account_id,
        v_recurring_transaction.category_id,
        v_recurring_transaction.created_by,
        v_recurring_transaction.description || ' (Auto)',
        v_recurring_transaction.amount,
        v_recurring_transaction.type,
        v_recurring_transaction.next_execution_date,
        COALESCE(v_recurring_transaction.notes, '') || ' - Generated from recurring transaction',
        true
      ) RETURNING id INTO v_transaction_id;
      
      -- Calculate next execution date
      v_next_date := calculate_next_execution_date(
        v_recurring_transaction.next_execution_date,
        v_recurring_transaction.frequency,
        v_recurring_transaction.interval_count,
        v_recurring_transaction.days_of_week,
        v_recurring_transaction.day_of_month,
        v_recurring_transaction.week_of_month,
        v_recurring_transaction.day_of_week
      );
      
      -- Update execution record as completed
      UPDATE recurring_transaction_executions 
      SET transaction_id = v_transaction_id,
          executed_date = CURRENT_DATE,
          execution_status = 'completed',
          updated_at = NOW()
      WHERE id = v_execution_id;
      
      -- Update recurring transaction
      UPDATE recurring_transactions 
      SET next_execution_date = v_next_date,
          last_execution_date = v_recurring_transaction.next_execution_date,
          execution_count = execution_count + 1,
          failed_execution_count = 0, -- Reset failed count on success
          updated_at = NOW()
      WHERE id = v_recurring_transaction.id;
      
      -- Check if this was the last execution
      IF v_recurring_transaction.max_occurrences IS NOT NULL AND 
         (v_recurring_transaction.execution_count + 1) >= v_recurring_transaction.max_occurrences THEN
        UPDATE recurring_transactions 
        SET is_active = false 
        WHERE id = v_recurring_transaction.id;
      END IF;
      
      v_processed_count := v_processed_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      -- Handle any errors during processing
      v_error_msg := SQLERRM;
      
      UPDATE recurring_transaction_executions 
      SET execution_status = 'failed',
          error_message = v_error_msg,
          updated_at = NOW()
      WHERE id = v_execution_id;
      
      UPDATE recurring_transactions 
      SET failed_execution_count = failed_execution_count + 1,
          updated_at = NOW()
      WHERE id = v_recurring_transaction.id;
      
      v_failed_count := v_failed_count + 1;
      v_error_messages := array_append(v_error_messages, 
        'Recurring transaction ' || v_recurring_transaction.id || ': ' || v_error_msg);
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_processed_count, v_failed_count, v_error_messages;
END;
$$ LANGUAGE plpgsql;

-- Function to get upcoming recurring transactions
CREATE OR REPLACE FUNCTION get_upcoming_recurring_transactions(
  p_family_id UUID,
  p_days_ahead INTEGER DEFAULT 30
)
RETURNS TABLE (
  recurring_transaction_id UUID,
  description VARCHAR,
  amount DECIMAL(12,2),
  type VARCHAR,
  frequency VARCHAR,
  next_date DATE,
  account_name VARCHAR,
  category_name VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rt.id,
    rt.description,
    rt.amount,
    rt.type,
    rt.frequency,
    rt.next_execution_date,
    fa.name as account_name,
    tc.name as category_name
  FROM recurring_transactions rt
  LEFT JOIN financial_accounts fa ON rt.account_id = fa.id
  LEFT JOIN transaction_categories tc ON rt.category_id = tc.id
  WHERE rt.family_id = p_family_id
    AND rt.is_active = true
    AND rt.next_execution_date <= CURRENT_DATE + p_days_ahead
    AND (rt.end_date IS NULL OR rt.next_execution_date <= rt.end_date)
    AND (rt.max_occurrences IS NULL OR rt.execution_count < rt.max_occurrences)
  ORDER BY rt.next_execution_date ASC, rt.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_recurring_transactions_updated_at 
  BEFORE UPDATE ON recurring_transactions 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_recurring_transaction_executions_updated_at 
  BEFORE UPDATE ON recurring_transaction_executions 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_recurring_transactions_family_id ON recurring_transactions(family_id);
CREATE INDEX idx_recurring_transactions_account_id ON recurring_transactions(account_id);
CREATE INDEX idx_recurring_transactions_next_execution ON recurring_transactions(next_execution_date) WHERE is_active = true;
CREATE INDEX idx_recurring_transactions_active ON recurring_transactions(is_active);
CREATE INDEX idx_recurring_transaction_executions_recurring_id ON recurring_transaction_executions(recurring_transaction_id);
CREATE INDEX idx_recurring_transaction_executions_status ON recurring_transaction_executions(execution_status);
CREATE INDEX idx_recurring_transaction_executions_scheduled_date ON recurring_transaction_executions(scheduled_date);

-- Row Level Security
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_transaction_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY recurring_transactions_family_isolation ON recurring_transactions 
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY recurring_transaction_executions_family_isolation ON recurring_transaction_executions 
  FOR ALL USING (
    recurring_transaction_id IN (
      SELECT rt.id FROM recurring_transactions rt
      JOIN family_members fm ON rt.family_id = fm.family_id
      WHERE fm.user_id = auth.uid()
    )
  );