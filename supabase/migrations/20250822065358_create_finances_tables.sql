-- Create finances module tables for Family Hub application

-- Transaction categories for organization
CREATE TABLE transaction_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  description TEXT,
  color VARCHAR DEFAULT '#3B82F6', -- Hex color for UI
  icon VARCHAR DEFAULT 'DollarSign', -- Lucide icon name
  type VARCHAR NOT NULL CHECK (type IN ('income', 'expense')),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, name, type)
);

-- Financial accounts (bank accounts, credit cards, cash, etc.)
CREATE TABLE financial_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  type VARCHAR NOT NULL CHECK (type IN ('checking', 'savings', 'credit_card', 'cash', 'investment', 'other')),
  balance DECIMAL(12,2) DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main transactions table
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  account_id UUID REFERENCES financial_accounts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES transaction_categories(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  
  -- Transaction details
  description VARCHAR NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  type VARCHAR NOT NULL CHECK (type IN ('income', 'expense')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Optional fields
  notes TEXT,
  receipt_url VARCHAR, -- For storing receipt images
  is_recurring BOOLEAN DEFAULT false,
  recurring_pattern JSONB, -- Store recurring rules as JSON
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget management
CREATE TABLE budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  category_id UUID REFERENCES transaction_categories(id) ON DELETE CASCADE,
  
  name VARCHAR NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  period VARCHAR NOT NULL CHECK (period IN ('weekly', 'monthly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE,
  
  -- Budget settings
  alert_threshold DECIMAL(3,2) DEFAULT 0.80, -- Alert at 80%
  is_active BOOLEAN DEFAULT true,
  
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(family_id, category_id, period, start_date)
);

-- Monthly budget summaries for performance
CREATE TABLE budget_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  budgeted_amount DECIMAL(12,2) NOT NULL,
  spent_amount DECIMAL(12,2) DEFAULT 0.00,
  remaining_amount DECIMAL(12,2) GENERATED ALWAYS AS (budgeted_amount - spent_amount) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(budget_id, year, month)
);

-- Apply update triggers to finance tables
CREATE TRIGGER update_financial_accounts_updated_at 
  BEFORE UPDATE ON financial_accounts 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at 
  BEFORE UPDATE ON transactions 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at 
  BEFORE UPDATE ON budgets 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_budget_summaries_updated_at 
  BEFORE UPDATE ON budget_summaries 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Indexes for better performance
CREATE INDEX idx_transaction_categories_family_id ON transaction_categories(family_id);
CREATE INDEX idx_transaction_categories_type ON transaction_categories(type);
CREATE INDEX idx_financial_accounts_family_id ON financial_accounts(family_id);
CREATE INDEX idx_financial_accounts_type ON financial_accounts(type);
CREATE INDEX idx_transactions_family_id ON transactions(family_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_budgets_family_id ON budgets(family_id);
CREATE INDEX idx_budgets_category_id ON budgets(category_id);
CREATE INDEX idx_budget_summaries_budget_id ON budget_summaries(budget_id);
CREATE INDEX idx_budget_summaries_year_month ON budget_summaries(year, month);

-- Function to update account balances automatically
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE financial_accounts 
    SET balance = balance + (CASE WHEN NEW.type = 'income' THEN NEW.amount ELSE -NEW.amount END),
        updated_at = NOW()
    WHERE id = NEW.account_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE financial_accounts 
    SET balance = balance - (CASE WHEN OLD.type = 'income' THEN OLD.amount ELSE -OLD.amount END),
        updated_at = NOW()
    WHERE id = OLD.account_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle account change
    IF OLD.account_id != NEW.account_id OR OLD.account_id IS NULL OR NEW.account_id IS NULL THEN
      -- Remove from old account
      IF OLD.account_id IS NOT NULL THEN
        UPDATE financial_accounts 
        SET balance = balance - (CASE WHEN OLD.type = 'income' THEN OLD.amount ELSE -OLD.amount END),
            updated_at = NOW()
        WHERE id = OLD.account_id;
      END IF;
      -- Add to new account
      IF NEW.account_id IS NOT NULL THEN
        UPDATE financial_accounts 
        SET balance = balance + (CASE WHEN NEW.type = 'income' THEN NEW.amount ELSE -NEW.amount END),
            updated_at = NOW()
        WHERE id = NEW.account_id;
      END IF;
    ELSE
      -- Same account, just update the difference
      UPDATE financial_accounts 
      SET balance = balance - (CASE WHEN OLD.type = 'income' THEN OLD.amount ELSE -OLD.amount END) + (CASE WHEN NEW.type = 'income' THEN NEW.amount ELSE -NEW.amount END),
          updated_at = NOW()
      WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

-- Apply balance update trigger
CREATE TRIGGER transaction_balance_trigger
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE PROCEDURE update_account_balance();

-- Function to insert default categories for new families
CREATE OR REPLACE FUNCTION create_default_categories_for_family(family_id_param UUID)
RETURNS VOID AS $$
BEGIN
  -- Default expense categories
  INSERT INTO transaction_categories (family_id, name, description, color, icon, type, is_default) VALUES
    (family_id_param, 'Groceries', 'Food and household essentials', '#22C55E', 'ShoppingCart', 'expense', true),
    (family_id_param, 'Transportation', 'Gas, public transport, car maintenance', '#3B82F6', 'Car', 'expense', true),
    (family_id_param, 'Utilities', 'Electricity, water, internet, phone', '#F59E0B', 'Zap', 'expense', true),
    (family_id_param, 'Entertainment', 'Movies, dining out, hobbies', '#EC4899', 'Film', 'expense', true),
    (family_id_param, 'Healthcare', 'Medical, dental, pharmacy', '#EF4444', 'Heart', 'expense', true),
    (family_id_param, 'Education', 'Books, courses, school supplies', '#8B5CF6', 'Book', 'expense', true),
    (family_id_param, 'Clothing', 'Clothes and accessories', '#06B6D4', 'Shirt', 'expense', true),
    (family_id_param, 'Home', 'Rent, mortgage, maintenance', '#10B981', 'Home', 'expense', true);
    
  -- Default income categories
  INSERT INTO transaction_categories (family_id, name, description, color, icon, type, is_default) VALUES
    (family_id_param, 'Salary', 'Regular job income', '#22C55E', 'Briefcase', 'income', true),
    (family_id_param, 'Freelance', 'Contract and freelance work', '#3B82F6', 'Code', 'income', true),
    (family_id_param, 'Investment', 'Dividends, interest, gains', '#F59E0B', 'TrendingUp', 'income', true),
    (family_id_param, 'Gift', 'Gifts and unexpected money', '#EC4899', 'Gift', 'income', true),
    (family_id_param, 'Other', 'Other income sources', '#6B7280', 'Plus', 'income', true);
END;
$$ language 'plpgsql';