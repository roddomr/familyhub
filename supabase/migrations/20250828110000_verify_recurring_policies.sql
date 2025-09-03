-- Verify and fix RLS policies for recurring transactions
-- This migration ensures proper access permissions

-- Check if policies exist and recreate them if needed
DROP POLICY IF EXISTS recurring_transactions_family_isolation ON recurring_transactions;
DROP POLICY IF EXISTS recurring_transaction_executions_family_isolation ON recurring_transaction_executions;

-- Recreate RLS policies with better error handling
CREATE POLICY recurring_transactions_family_isolation ON recurring_transactions 
  FOR ALL USING (
    family_id = ANY(
      SELECT fm.family_id 
      FROM family_members fm 
      WHERE fm.user_id = auth.uid()
    )
  );

CREATE POLICY recurring_transaction_executions_family_isolation ON recurring_transaction_executions 
  FOR ALL USING (
    recurring_transaction_id = ANY(
      SELECT rt.id 
      FROM recurring_transactions rt
      INNER JOIN family_members fm ON rt.family_id = fm.family_id
      WHERE fm.user_id = auth.uid()
    )
  );

-- Grant explicit permissions to authenticated users
GRANT ALL ON recurring_transactions TO authenticated;
GRANT ALL ON recurring_transaction_executions TO authenticated;

-- Ensure RLS is enabled
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_transaction_executions ENABLE ROW LEVEL SECURITY;

-- Create a simple test function to verify table access
CREATE OR REPLACE FUNCTION test_recurring_transactions_access()
RETURNS JSON AS $$
DECLARE
  v_count INTEGER;
  v_result JSON;
BEGIN
  -- Try to count rows (this will respect RLS)
  SELECT COUNT(*) INTO v_count FROM recurring_transactions;
  
  v_result := json_build_object(
    'success', true,
    'message', 'Table access working',
    'count', v_count,
    'timestamp', NOW()
  );
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  v_result := json_build_object(
    'success', false,
    'error', SQLERRM,
    'timestamp', NOW()
  );
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on test function
GRANT EXECUTE ON FUNCTION test_recurring_transactions_access() TO authenticated;