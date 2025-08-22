-- Fix RLS policies for logs table to allow proper logging

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "System can insert logs" ON logs;

-- Create new policy that allows logged-in users to insert their own logs
CREATE POLICY "Users can insert own logs" ON logs
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    (user_id = auth.uid() OR user_id IS NULL)
  );

-- Also allow the log functions to insert logs without user context
CREATE POLICY "Log functions can insert" ON logs
  FOR INSERT WITH CHECK (
    -- Allow inserts from database functions
    current_user = 'postgres' OR 
    current_user = 'service_role' OR
    -- Allow inserts with valid user_id or null user_id for system logs
    (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR user_id IS NULL))
  );

-- Drop the conflicting policy and recreate with better logic
DROP POLICY IF EXISTS "Users can insert own logs" ON logs;

-- Create a comprehensive insert policy
CREATE POLICY "Allow logging" ON logs
  FOR INSERT WITH CHECK (
    -- Allow if user is authenticated and logging their own actions
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
    -- Allow system logs with no user_id
    (user_id IS NULL) OR
    -- Allow service role to insert logs
    (auth.jwt() ->> 'role' = 'service_role')
  );