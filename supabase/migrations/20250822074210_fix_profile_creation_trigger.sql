-- Fix profile creation trigger to bypass RLS issues

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
DROP FUNCTION IF EXISTS create_profile_for_user();

-- Create an improved profile creation function that bypasses RLS
CREATE OR REPLACE FUNCTION create_profile_for_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile with RLS bypass
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
  
  -- Log the profile creation
  INSERT INTO public.logs (level, message, details, source, module, action, user_id)
  VALUES (
    'info',
    'User profile created during registration',
    json_build_object(
      'user_id', NEW.id,
      'email', NEW.email,
      'full_name', COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    )::jsonb,
    'database',
    'auth',
    'create_profile',
    NEW.id
  );
  
  RETURN NEW;
EXCEPTION 
  WHEN OTHERS THEN
    -- Log any errors during profile creation
    INSERT INTO public.logs (level, message, details, source, module, action, error_code, user_id)
    VALUES (
      'error',
      'Failed to create user profile during registration: ' || SQLERRM,
      json_build_object(
        'user_id', NEW.id,
        'email', NEW.email,
        'sqlstate', SQLSTATE,
        'sqlerrm', SQLERRM
      )::jsonb,
      'database',
      'auth',
      'create_profile',
      'PROFILE_CREATION_ERROR',
      NEW.id
    );
    -- Re-raise the exception to prevent user creation if profile fails
    RAISE;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER create_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE create_profile_for_user();

-- Grant necessary permissions to the function
GRANT EXECUTE ON FUNCTION create_profile_for_user() TO anon, authenticated;