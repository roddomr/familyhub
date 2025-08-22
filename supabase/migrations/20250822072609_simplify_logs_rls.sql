-- Simplify logs RLS policies to allow proper logging

-- First, disable RLS temporarily to clean up
ALTER TABLE logs DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own logs" ON logs;
DROP POLICY IF EXISTS "System can insert logs" ON logs;
DROP POLICY IF EXISTS "No updates on logs" ON logs;
DROP POLICY IF EXISTS "No deletes on logs" ON logs;
DROP POLICY IF EXISTS "Users can insert own logs" ON logs;
DROP POLICY IF EXISTS "Log functions can insert" ON logs;
DROP POLICY IF EXISTS "Allow logging" ON logs;

-- Re-enable RLS
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Create simple, working policies

-- Allow users to view their own logs and system logs
CREATE POLICY "logs_select_policy" ON logs
  FOR SELECT USING (
    auth.uid() = user_id OR user_id IS NULL
  );

-- Allow anyone authenticated to insert logs (we'll control this at app level)
CREATE POLICY "logs_insert_policy" ON logs
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL OR user_id IS NULL
  );

-- Prevent updates and deletes (immutable audit trail)
CREATE POLICY "logs_no_update" ON logs
  FOR UPDATE USING (false);

CREATE POLICY "logs_no_delete" ON logs
  FOR DELETE USING (false);