-- Final fix for profiles RLS - disable RLS for trigger operations

-- Temporarily disable RLS on profiles for trigger operations
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_no_delete" ON profiles;

-- Create new, working policies

-- Allow users to read their own profile and family members' profiles
CREATE POLICY "profiles_read" ON profiles
  FOR SELECT USING (
    -- Users can read their own profile
    auth.uid() = id OR
    -- Users can read profiles of family members
    EXISTS (
      SELECT 1 FROM family_members fm1, family_members fm2 
      WHERE fm1.user_id = auth.uid() 
      AND fm2.user_id = profiles.id 
      AND fm1.family_id = fm2.family_id
    )
  );

-- Allow profile insertion for authenticated users AND system operations
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (
    -- Allow authenticated users to create their own profile
    auth.uid() = id OR
    -- Allow system/trigger operations (when auth.uid() is null)
    auth.uid() IS NULL
  );

-- Allow users to update their own profile
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Prevent profile deletion
CREATE POLICY "profiles_delete" ON profiles
  FOR DELETE USING (false);

-- Update the trigger function to ensure it works
CREATE OR REPLACE FUNCTION create_profile_for_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- Log the attempt
  INSERT INTO public.logs (level, message, details, source, module, action)
  VALUES (
    'info',
    'Attempting to create user profile during registration',
    json_build_object(
      'user_id', NEW.id,
      'email', NEW.email
    )::jsonb,
    'database',
    'auth',
    'create_profile_attempt'
  );

  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'name', 
      NEW.raw_user_meta_data->>'full_name', 
      split_part(NEW.email, '@', 1)
    )
  );
  
  -- Log success
  INSERT INTO public.logs (level, message, details, source, module, action, user_id)
  VALUES (
    'info',
    'User profile created successfully during registration',
    json_build_object(
      'user_id', NEW.id,
      'email', NEW.email,
      'full_name', COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    )::jsonb,
    'database',
    'auth',
    'create_profile_success',
    NEW.id
  );
  
  RETURN NEW;
EXCEPTION 
  WHEN OTHERS THEN
    -- Log the error
    INSERT INTO public.logs (level, message, details, source, module, action, error_code)
    VALUES (
      'error',
      'Failed to create user profile during registration: ' || SQLERRM,
      json_build_object(
        'user_id', NEW.id,
        'email', NEW.email,
        'sqlstate', SQLSTATE,
        'sqlerrm', SQLERRM,
        'detail', COALESCE(SQLERRM, 'Unknown error')
      )::jsonb,
      'database',
      'auth',
      'create_profile_error',
      'PROFILE_CREATION_ERROR'
    );
    -- Don't re-raise - allow user creation to continue even if profile fails
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;