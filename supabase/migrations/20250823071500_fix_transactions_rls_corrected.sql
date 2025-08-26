-- Fix RLS policies for transactions table (corrected version)

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert transactions for their family" ON transactions;
DROP POLICY IF EXISTS "Users can view transactions for their family" ON transactions;
DROP POLICY IF EXISTS "Users can update transactions for their family" ON transactions;
DROP POLICY IF EXISTS "Users can delete transactions for their family" ON transactions;

-- Enable RLS on transactions table
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policy for inserting transactions
-- Users can insert transactions if they belong to the family
CREATE POLICY "Users can insert transactions for their family" ON transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = transactions.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

-- Policy for selecting transactions
-- Users can view transactions if they belong to the family
CREATE POLICY "Users can view transactions for their family" ON transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = transactions.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

-- Policy for updating transactions
-- Users can update transactions if they belong to the family
CREATE POLICY "Users can update transactions for their family" ON transactions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = transactions.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

-- Policy for deleting transactions
-- Users can delete transactions if they belong to the family
CREATE POLICY "Users can delete transactions for their family" ON transactions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = transactions.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

-- Also fix financial_accounts RLS policies
DROP POLICY IF EXISTS "Users can insert accounts for their family" ON financial_accounts;
DROP POLICY IF EXISTS "Users can view accounts for their family" ON financial_accounts;
DROP POLICY IF EXISTS "Users can update accounts for their family" ON financial_accounts;

ALTER TABLE financial_accounts ENABLE ROW LEVEL SECURITY;

-- Policy for inserting financial accounts
CREATE POLICY "Users can insert accounts for their family" ON financial_accounts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = financial_accounts.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

-- Policy for selecting financial accounts
CREATE POLICY "Users can view accounts for their family" ON financial_accounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = financial_accounts.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

-- Policy for updating financial accounts
CREATE POLICY "Users can update accounts for their family" ON financial_accounts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = financial_accounts.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT ALL ON transactions TO authenticated;
GRANT ALL ON financial_accounts TO authenticated;