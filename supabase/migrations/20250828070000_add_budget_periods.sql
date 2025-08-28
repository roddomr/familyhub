-- Add new budget periods: bi-weekly (quincenal) and fortnightly (catorcenal)
-- Update the budget period constraint to include the new periods

ALTER TABLE budgets 
DROP CONSTRAINT budgets_period_check;

ALTER TABLE budgets 
ADD CONSTRAINT budgets_period_check 
CHECK (period IN ('weekly', 'bi-weekly', 'fortnightly', 'monthly', 'yearly'));

-- Add comment for clarity
COMMENT ON COLUMN budgets.period IS 'Budget period: weekly (7 days), bi-weekly (14 days), fortnightly (15 days), monthly, yearly';