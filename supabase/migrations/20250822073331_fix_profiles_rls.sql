-- Fix RLS policies for profiles table to allow user registration

-- First, check current policies and drop problematic ones
DROP POLICY IF EXISTS "Users can view and update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Temporarily disable RLS to clean up
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies that allow proper user registration and profile management

-- Allow users to read their own profile and others' basic info for family features
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT USING (
    auth.uid() = id OR 
    -- Allow viewing profiles of family members
    EXISTS (
      SELECT 1 FROM family_members fm1, family_members fm2 
      WHERE fm1.user_id = auth.uid() 
      AND fm2.user_id = profiles.id 
      AND fm1.family_id = fm2.family_id
    )
  );

-- Allow users to insert their own profile (for registration)
CREATE POLICY "profiles_insert_policy" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Prevent profile deletion (users should be deactivated, not deleted)
CREATE POLICY "profiles_no_delete" ON profiles
  FOR DELETE USING (false);