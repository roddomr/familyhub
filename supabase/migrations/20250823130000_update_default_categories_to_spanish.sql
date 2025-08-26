-- Update default transaction categories to Spanish
-- This migration updates the default category creation function to use Spanish names

-- First, update the existing function to create categories in Spanish
CREATE OR REPLACE FUNCTION create_default_categories_for_family(family_id_param UUID)
RETURNS VOID AS $$
BEGIN
  -- Default expense categories in Spanish
  INSERT INTO transaction_categories (family_id, name, description, color, icon, type, is_default) VALUES
    (family_id_param, 'Comestibles', 'Alimentos y artículos esenciales del hogar', '#22C55E', 'ShoppingCart', 'expense', true),
    (family_id_param, 'Transporte', 'Gasolina, transporte público, mantenimiento del auto', '#3B82F6', 'Car', 'expense', true),
    (family_id_param, 'Servicios', 'Electricidad, agua, internet, teléfono', '#F59E0B', 'Zap', 'expense', true),
    (family_id_param, 'Entretenimiento', 'Cine, restaurantes, pasatiempos', '#EC4899', 'Film', 'expense', true),
    (family_id_param, 'Salud', 'Médico, dental, farmacia', '#EF4444', 'Heart', 'expense', true),
    (family_id_param, 'Educación', 'Libros, cursos, útiles escolares', '#8B5CF6', 'Book', 'expense', true),
    (family_id_param, 'Ropa', 'Ropa y accesorios', '#06B6D4', 'Shirt', 'expense', true),
    (family_id_param, 'Hogar', 'Renta, hipoteca, mantenimiento', '#10B981', 'Home', 'expense', true);
    
  -- Default income categories in Spanish
  INSERT INTO transaction_categories (family_id, name, description, color, icon, type, is_default) VALUES
    (family_id_param, 'Salario', 'Ingresos del trabajo regular', '#22C55E', 'Briefcase', 'income', true),
    (family_id_param, 'Freelance', 'Trabajo de contrato y freelance', '#3B82F6', 'Code', 'income', true),
    (family_id_param, 'Inversión', 'Dividendos, intereses, ganancias', '#F59E0B', 'TrendingUp', 'income', true),
    (family_id_param, 'Regalo', 'Regalos y dinero inesperado', '#EC4899', 'Gift', 'income', true),
    (family_id_param, 'Otro', 'Otras fuentes de ingresos', '#6B7280', 'Plus', 'income', true);
END;
$$ language 'plpgsql';

-- Optional: Update existing default categories to Spanish for existing families
-- This will only update categories that have the exact English names from the original function
UPDATE transaction_categories 
SET 
  name = CASE 
    WHEN name = 'Groceries' THEN 'Comestibles'
    WHEN name = 'Transportation' THEN 'Transporte'
    WHEN name = 'Utilities' THEN 'Servicios'
    WHEN name = 'Entertainment' THEN 'Entretenimiento'
    WHEN name = 'Healthcare' THEN 'Salud'
    WHEN name = 'Education' THEN 'Educación'
    WHEN name = 'Clothing' THEN 'Ropa'
    WHEN name = 'Home' THEN 'Hogar'
    WHEN name = 'Salary' THEN 'Salario'
    WHEN name = 'Freelance' THEN 'Freelance'
    WHEN name = 'Investment' THEN 'Inversión'
    WHEN name = 'Gift' THEN 'Regalo'
    WHEN name = 'Other' THEN 'Otro'
    ELSE name
  END,
  description = CASE 
    WHEN name = 'Groceries' THEN 'Alimentos y artículos esenciales del hogar'
    WHEN name = 'Transportation' THEN 'Gasolina, transporte público, mantenimiento del auto'
    WHEN name = 'Utilities' THEN 'Electricidad, agua, internet, teléfono'
    WHEN name = 'Entertainment' THEN 'Cine, restaurantes, pasatiempos'
    WHEN name = 'Healthcare' THEN 'Médico, dental, farmacia'
    WHEN name = 'Education' THEN 'Libros, cursos, útiles escolares'
    WHEN name = 'Clothing' THEN 'Ropa y accesorios'
    WHEN name = 'Home' THEN 'Renta, hipoteca, mantenimiento'
    WHEN name = 'Salary' THEN 'Ingresos del trabajo regular'
    WHEN name = 'Freelance' THEN 'Trabajo de contrato y freelance'
    WHEN name = 'Investment' THEN 'Dividendos, intereses, ganancias'
    WHEN name = 'Gift' THEN 'Regalos y dinero inesperado'
    WHEN name = 'Other' AND type = 'income' THEN 'Otras fuentes de ingresos'
    ELSE description
  END
WHERE is_default = true 
  AND name IN ('Groceries', 'Transportation', 'Utilities', 'Entertainment', 'Healthcare', 'Education', 'Clothing', 'Home', 'Salary', 'Freelance', 'Investment', 'Gift', 'Other');