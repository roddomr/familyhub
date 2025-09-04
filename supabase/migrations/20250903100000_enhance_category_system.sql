-- Enhanced Category System for Family Hub
-- Add subcategories, better budget management, and improved customization

-- Add parent_id for nested categories (subcategories)
ALTER TABLE transaction_categories 
ADD COLUMN parent_id UUID REFERENCES transaction_categories(id) ON DELETE CASCADE,
ADD COLUMN sort_order INTEGER DEFAULT 0,
ADD COLUMN is_active BOOLEAN DEFAULT true,
ADD COLUMN budget_default_amount DECIMAL(12,2) DEFAULT 0.00,
ADD COLUMN budget_default_period VARCHAR DEFAULT 'monthly' CHECK (budget_default_period IN ('weekly', 'monthly', 'yearly'));

-- Update unique constraint to allow subcategories
ALTER TABLE transaction_categories DROP CONSTRAINT transaction_categories_family_id_name_type_key;
ALTER TABLE transaction_categories ADD CONSTRAINT transaction_categories_family_parent_name_type_key 
UNIQUE(family_id, parent_id, name, type);

-- Create category budgets table for more flexible budget management
CREATE TABLE category_budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  category_id UUID REFERENCES transaction_categories(id) ON DELETE CASCADE,
  
  -- Budget details
  name VARCHAR NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  period VARCHAR NOT NULL CHECK (period IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  
  -- Alert settings
  alert_threshold DECIMAL(3,2) DEFAULT 0.80, -- Alert at 80%
  alert_enabled BOOLEAN DEFAULT true,
  
  -- Rollover settings
  rollover_enabled BOOLEAN DEFAULT false,
  rollover_limit DECIMAL(12,2),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(family_id, category_id, period, start_date)
);

-- Create category budget summaries for tracking
CREATE TABLE category_budget_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID REFERENCES category_budgets(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER,
  quarter INTEGER,
  week_number INTEGER,
  
  budgeted_amount DECIMAL(12,2) NOT NULL,
  spent_amount DECIMAL(12,2) DEFAULT 0.00,
  rollover_amount DECIMAL(12,2) DEFAULT 0.00,
  remaining_amount DECIMAL(12,2) GENERATED ALWAYS AS (budgeted_amount + rollover_amount - spent_amount) STORED,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(budget_id, year, month, quarter, week_number)
);

-- Create indexes for performance
CREATE INDEX idx_transaction_categories_parent_id ON transaction_categories(parent_id);
CREATE INDEX idx_transaction_categories_sort_order ON transaction_categories(sort_order);
CREATE INDEX idx_category_budgets_family_id ON category_budgets(family_id);
CREATE INDEX idx_category_budgets_category_id ON category_budgets(category_id);
CREATE INDEX idx_category_budget_summaries_budget_id ON category_budget_summaries(budget_id);
CREATE INDEX idx_category_budget_summaries_year_month ON category_budget_summaries(year, month);

-- Add update triggers
CREATE TRIGGER update_category_budgets_updated_at 
  BEFORE UPDATE ON category_budgets 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_category_budget_summaries_updated_at 
  BEFORE UPDATE ON category_budget_summaries 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Function to get category hierarchy (parents and children)
CREATE OR REPLACE FUNCTION get_category_hierarchy(family_id_param UUID)
RETURNS TABLE(
  id UUID,
  name VARCHAR,
  parent_id UUID,
  parent_name VARCHAR,
  level INTEGER,
  path TEXT,
  type VARCHAR,
  color VARCHAR,
  icon VARCHAR,
  sort_order INTEGER,
  is_active BOOLEAN,
  budget_default_amount DECIMAL,
  budget_default_period VARCHAR
) AS $$
WITH RECURSIVE category_tree AS (
  -- Base case: root categories (no parent)
  SELECT 
    c.id,
    c.name,
    c.parent_id,
    NULL::VARCHAR as parent_name,
    0 as level,
    c.name::TEXT as path,
    c.type,
    c.color,
    c.icon,
    c.sort_order,
    c.is_active,
    c.budget_default_amount,
    c.budget_default_period
  FROM transaction_categories c
  WHERE c.family_id = family_id_param AND c.parent_id IS NULL
  
  UNION ALL
  
  -- Recursive case: child categories
  SELECT 
    c.id,
    c.name,
    c.parent_id,
    ct.name as parent_name,
    ct.level + 1 as level,
    ct.path || ' > ' || c.name as path,
    c.type,
    c.color,
    c.icon,
    c.sort_order,
    c.is_active,
    c.budget_default_amount,
    c.budget_default_period
  FROM transaction_categories c
  INNER JOIN category_tree ct ON c.parent_id = ct.id
  WHERE c.family_id = family_id_param
)
SELECT * FROM category_tree ORDER BY type, level, sort_order, name;
$$ LANGUAGE SQL;

-- Function to create default subcategories for existing categories
CREATE OR REPLACE FUNCTION create_default_subcategories()
RETURNS VOID AS $$
DECLARE
  family_rec RECORD;
  category_rec RECORD;
BEGIN
  -- For each family, add subcategories to existing categories
  FOR family_rec IN SELECT id FROM families LOOP
    -- Add subcategories to Groceries
    SELECT id INTO category_rec FROM transaction_categories 
    WHERE family_id = family_rec.id AND name = 'Groceries' AND type = 'expense' LIMIT 1;
    
    IF category_rec.id IS NOT NULL THEN
      INSERT INTO transaction_categories (family_id, parent_id, name, description, color, icon, type, sort_order) VALUES
        (family_rec.id, category_rec.id, 'Fresh Produce', 'Fruits and vegetables', '#22C55E', 'Apple', 'expense', 1),
        (family_rec.id, category_rec.id, 'Meat & Dairy', 'Meat, fish, milk, cheese', '#22C55E', 'Beef', 'expense', 2),
        (family_rec.id, category_rec.id, 'Household Items', 'Cleaning supplies, toiletries', '#22C55E', 'Spray', 'expense', 3)
      ON CONFLICT DO NOTHING;
    END IF;

    -- Add subcategories to Transportation
    SELECT id INTO category_rec FROM transaction_categories 
    WHERE family_id = family_rec.id AND name = 'Transportation' AND type = 'expense' LIMIT 1;
    
    IF category_rec.id IS NOT NULL THEN
      INSERT INTO transaction_categories (family_id, parent_id, name, description, color, icon, type, sort_order) VALUES
        (family_rec.id, category_rec.id, 'Gas', 'Fuel for vehicles', '#3B82F6', 'Fuel', 'expense', 1),
        (family_rec.id, category_rec.id, 'Public Transit', 'Bus, train, subway', '#3B82F6', 'Train', 'expense', 2),
        (family_rec.id, category_rec.id, 'Maintenance', 'Car repairs, oil changes', '#3B82F6', 'Wrench', 'expense', 3),
        (family_rec.id, category_rec.id, 'Parking', 'Parking fees and meters', '#3B82F6', 'ParkingCircle', 'expense', 4)
      ON CONFLICT DO NOTHING;
    END IF;

    -- Add subcategories to Entertainment
    SELECT id INTO category_rec FROM transaction_categories 
    WHERE family_id = family_rec.id AND name = 'Entertainment' AND type = 'expense' LIMIT 1;
    
    IF category_rec.id IS NOT NULL THEN
      INSERT INTO transaction_categories (family_id, parent_id, name, description, color, icon, type, sort_order) VALUES
        (family_rec.id, category_rec.id, 'Dining Out', 'Restaurants and takeout', '#EC4899', 'UtensilsCrossed', 'expense', 1),
        (family_rec.id, category_rec.id, 'Movies & Shows', 'Cinema, streaming services', '#EC4899', 'Monitor', 'expense', 2),
        (family_rec.id, category_rec.id, 'Games & Hobbies', 'Games, sports, hobbies', '#EC4899', 'Gamepad2', 'expense', 3)
      ON CONFLICT DO NOTHING;
    END IF;

    -- Add subcategories to Salary (income)
    SELECT id INTO category_rec FROM transaction_categories 
    WHERE family_id = family_rec.id AND name = 'Salary' AND type = 'income' LIMIT 1;
    
    IF category_rec.id IS NOT NULL THEN
      INSERT INTO transaction_categories (family_id, parent_id, name, description, color, icon, type, sort_order) VALUES
        (family_rec.id, category_rec.id, 'Base Salary', 'Regular monthly salary', '#22C55E', 'DollarSign', 'income', 1),
        (family_rec.id, category_rec.id, 'Overtime', 'Extra hours worked', '#22C55E', 'Clock', 'income', 2),
        (family_rec.id, category_rec.id, 'Bonus', 'Performance bonuses', '#22C55E', 'Award', 'income', 3)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to update budget summaries automatically
CREATE OR REPLACE FUNCTION update_category_budget_summary()
RETURNS TRIGGER AS $$
DECLARE
  budget_rec RECORD;
  summary_year INTEGER;
  summary_month INTEGER;
  summary_quarter INTEGER;
  summary_week INTEGER;
BEGIN
  -- Only process if transaction has a category
  IF (TG_OP = 'INSERT' AND NEW.category_id IS NULL) OR 
     (TG_OP = 'UPDATE' AND NEW.category_id IS NULL) OR
     (TG_OP = 'DELETE' AND OLD.category_id IS NULL) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Get relevant budget information
  FOR budget_rec IN 
    SELECT cb.id, cb.period, cb.start_date, cb.end_date
    FROM category_budgets cb
    WHERE cb.category_id = COALESCE(NEW.category_id, OLD.category_id)
      AND cb.is_active = true
      AND cb.start_date <= COALESCE(NEW.date, OLD.date)
      AND (cb.end_date IS NULL OR cb.end_date >= COALESCE(NEW.date, OLD.date))
  LOOP
    -- Calculate summary period values
    summary_year := EXTRACT(YEAR FROM COALESCE(NEW.date, OLD.date));
    summary_month := CASE WHEN budget_rec.period IN ('monthly', 'weekly') THEN EXTRACT(MONTH FROM COALESCE(NEW.date, OLD.date)) ELSE NULL END;
    summary_quarter := CASE WHEN budget_rec.period = 'quarterly' THEN EXTRACT(QUARTER FROM COALESCE(NEW.date, OLD.date)) ELSE NULL END;
    summary_week := CASE WHEN budget_rec.period = 'weekly' THEN EXTRACT(WEEK FROM COALESCE(NEW.date, OLD.date)) ELSE NULL END;

    -- Insert or update budget summary
    INSERT INTO category_budget_summaries (budget_id, year, month, quarter, week_number, budgeted_amount, spent_amount)
    VALUES (budget_rec.id, summary_year, summary_month, summary_quarter, summary_week, 
            (SELECT amount FROM category_budgets WHERE id = budget_rec.id), 
            CASE WHEN TG_OP = 'INSERT' THEN NEW.amount ELSE 0 END)
    ON CONFLICT (budget_id, year, month, quarter, week_number)
    DO UPDATE SET
      spent_amount = category_budget_summaries.spent_amount + 
        CASE 
          WHEN TG_OP = 'INSERT' THEN NEW.amount
          WHEN TG_OP = 'UPDATE' THEN NEW.amount - OLD.amount
          WHEN TG_OP = 'DELETE' THEN -OLD.amount
          ELSE 0
        END,
      updated_at = NOW();
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply budget summary update trigger
CREATE TRIGGER transaction_category_budget_summary_trigger
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE PROCEDURE update_category_budget_summary();

-- Create default subcategories for existing families
SELECT create_default_subcategories();