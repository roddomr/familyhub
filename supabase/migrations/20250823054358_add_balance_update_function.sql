-- Add function to update account balances when transactions are added

-- Function to update account balance
CREATE OR REPLACE FUNCTION update_account_balance(
  account_id UUID,
  amount_change DECIMAL(12,2)
)
RETURNS void AS $$
BEGIN
  UPDATE financial_accounts 
  SET 
    balance = balance + amount_change,
    updated_at = NOW()
  WHERE id = account_id;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_account_balance(UUID, DECIMAL) TO authenticated;