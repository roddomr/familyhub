-- Setup Row Level Security (RLS) policies for Family Hub

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_summaries ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is a member of a family
CREATE OR REPLACE FUNCTION public.user_is_family_member(family_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM family_members
    WHERE family_members.family_id = $1
    AND family_members.user_id = auth.uid()
  );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Helper function to check if user is admin/parent of a family
CREATE OR REPLACE FUNCTION public.user_is_family_admin(family_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM family_members
    WHERE family_members.family_id = $1
    AND family_members.user_id = auth.uid()
    AND family_members.role IN ('admin', 'parent')
  );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- PROFILES POLICIES
-- Users can read and update their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- FAMILIES POLICIES
-- Users can read families they are members of
CREATE POLICY "Users can view their families" ON families
  FOR SELECT USING (public.user_is_family_member(id));

-- Users can create new families
CREATE POLICY "Users can create families" ON families
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Only family admins can update families
CREATE POLICY "Family admins can update families" ON families
  FOR UPDATE USING (public.user_is_family_admin(id));

-- Only family admins can delete families
CREATE POLICY "Family admins can delete families" ON families
  FOR DELETE USING (public.user_is_family_admin(id));

-- FAMILY_MEMBERS POLICIES
-- Users can view members of their families
CREATE POLICY "Users can view family members" ON family_members
  FOR SELECT USING (public.user_is_family_member(family_id));

-- Family admins can add new members
CREATE POLICY "Family admins can add members" ON family_members
  FOR INSERT WITH CHECK (public.user_is_family_admin(family_id));

-- Family admins can update member roles
CREATE POLICY "Family admins can update members" ON family_members
  FOR UPDATE USING (public.user_is_family_admin(family_id));

-- Family admins can remove members, users can remove themselves
CREATE POLICY "Family admins can remove members or users can leave" ON family_members
  FOR DELETE USING (
    public.user_is_family_admin(family_id) OR 
    user_id = auth.uid()
  );

-- TRANSACTION_CATEGORIES POLICIES
-- Family members can view categories
CREATE POLICY "Family members can view categories" ON transaction_categories
  FOR SELECT USING (public.user_is_family_member(family_id));

-- Family members can create categories
CREATE POLICY "Family members can create categories" ON transaction_categories
  FOR INSERT WITH CHECK (public.user_is_family_member(family_id));

-- Family members can update categories (non-default ones)
CREATE POLICY "Family members can update non-default categories" ON transaction_categories
  FOR UPDATE USING (
    public.user_is_family_member(family_id) AND 
    (NOT is_default OR public.user_is_family_admin(family_id))
  );

-- Only family admins can delete categories
CREATE POLICY "Family admins can delete categories" ON transaction_categories
  FOR DELETE USING (public.user_is_family_admin(family_id));

-- FINANCIAL_ACCOUNTS POLICIES
-- Family members can view accounts
CREATE POLICY "Family members can view accounts" ON financial_accounts
  FOR SELECT USING (public.user_is_family_member(family_id));

-- Family members can create accounts
CREATE POLICY "Family members can create accounts" ON financial_accounts
  FOR INSERT WITH CHECK (
    public.user_is_family_member(family_id) AND 
    auth.uid() = created_by
  );

-- Account creators or family admins can update accounts
CREATE POLICY "Account owners or admins can update accounts" ON financial_accounts
  FOR UPDATE USING (
    public.user_is_family_member(family_id) AND 
    (auth.uid() = created_by OR public.user_is_family_admin(family_id))
  );

-- Account creators or family admins can delete accounts
CREATE POLICY "Account owners or admins can delete accounts" ON financial_accounts
  FOR DELETE USING (
    public.user_is_family_member(family_id) AND 
    (auth.uid() = created_by OR public.user_is_family_admin(family_id))
  );

-- TRANSACTIONS POLICIES
-- Family members can view transactions
CREATE POLICY "Family members can view transactions" ON transactions
  FOR SELECT USING (public.user_is_family_member(family_id));

-- Family members can create transactions
CREATE POLICY "Family members can create transactions" ON transactions
  FOR INSERT WITH CHECK (
    public.user_is_family_member(family_id) AND 
    auth.uid() = created_by
  );

-- Transaction creators can update their transactions
CREATE POLICY "Transaction creators can update transactions" ON transactions
  FOR UPDATE USING (
    public.user_is_family_member(family_id) AND 
    auth.uid() = created_by
  );

-- Transaction creators or family admins can delete transactions
CREATE POLICY "Transaction creators or admins can delete transactions" ON transactions
  FOR DELETE USING (
    public.user_is_family_member(family_id) AND 
    (auth.uid() = created_by OR public.user_is_family_admin(family_id))
  );

-- BUDGETS POLICIES
-- Family members can view budgets
CREATE POLICY "Family members can view budgets" ON budgets
  FOR SELECT USING (public.user_is_family_member(family_id));

-- Family members can create budgets
CREATE POLICY "Family members can create budgets" ON budgets
  FOR INSERT WITH CHECK (
    public.user_is_family_member(family_id) AND 
    auth.uid() = created_by
  );

-- Budget creators or family admins can update budgets
CREATE POLICY "Budget creators or admins can update budgets" ON budgets
  FOR UPDATE USING (
    public.user_is_family_member(family_id) AND 
    (auth.uid() = created_by OR public.user_is_family_admin(family_id))
  );

-- Budget creators or family admins can delete budgets
CREATE POLICY "Budget creators or admins can delete budgets" ON budgets
  FOR DELETE USING (
    public.user_is_family_member(family_id) AND 
    (auth.uid() = created_by OR public.user_is_family_admin(family_id))
  );

-- BUDGET_SUMMARIES POLICIES
-- Family members can view budget summaries
CREATE POLICY "Family members can view budget summaries" ON budget_summaries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM budgets 
      WHERE budgets.id = budget_summaries.budget_id 
      AND public.user_is_family_member(budgets.family_id)
    )
  );

-- System can insert/update budget summaries (via triggers)
CREATE POLICY "System can manage budget summaries" ON budget_summaries
  FOR ALL USING (true) WITH CHECK (true);