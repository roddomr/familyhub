-- Create comprehensive logging system for Family Hub

-- Logs table for application logging
CREATE TABLE logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  level VARCHAR NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),
  message TEXT NOT NULL,
  details JSONB,
  source VARCHAR NOT NULL, -- e.g., 'frontend', 'backend', 'database'
  module VARCHAR, -- e.g., 'auth', 'families', 'finances'
  action VARCHAR, -- e.g., 'create_family', 'add_transaction'
  error_code VARCHAR,
  stack_trace TEXT,
  user_agent VARCHAR,
  ip_address INET,
  session_id VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_logs_user_id ON logs(user_id);
CREATE INDEX idx_logs_level ON logs(level);
CREATE INDEX idx_logs_created_at ON logs(created_at DESC);
CREATE INDEX idx_logs_module_action ON logs(module, action);
CREATE INDEX idx_logs_source ON logs(source);

-- Function to log errors automatically
CREATE OR REPLACE FUNCTION log_error(
  p_user_id UUID DEFAULT NULL,
  p_level VARCHAR DEFAULT 'error',
  p_message TEXT DEFAULT '',
  p_details JSONB DEFAULT NULL,
  p_source VARCHAR DEFAULT 'database',
  p_module VARCHAR DEFAULT NULL,
  p_action VARCHAR DEFAULT NULL,
  p_error_code VARCHAR DEFAULT NULL,
  p_stack_trace TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO logs (
    user_id, level, message, details, source, module, action, error_code, stack_trace
  ) VALUES (
    p_user_id, p_level, p_message, p_details, p_source, p_module, p_action, p_error_code, p_stack_trace
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Function to log info messages
CREATE OR REPLACE FUNCTION log_info(
  p_user_id UUID DEFAULT NULL,
  p_message TEXT DEFAULT '',
  p_details JSONB DEFAULT NULL,
  p_source VARCHAR DEFAULT 'database',
  p_module VARCHAR DEFAULT NULL,
  p_action VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO logs (
    user_id, level, message, details, source, module, action
  ) VALUES (
    p_user_id, 'info', p_message, p_details, p_source, p_module, p_action
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Enhanced family creation function with logging
CREATE OR REPLACE FUNCTION create_family_with_logging(
  p_name VARCHAR,
  p_description TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT auth.uid()
)
RETURNS JSONB AS $$
DECLARE
  family_record families%ROWTYPE;
  log_details JSONB;
  result JSONB;
BEGIN
  -- Validate input
  IF p_name IS NULL OR trim(p_name) = '' THEN
    PERFORM log_error(
      p_created_by,
      'error',
      'Family creation failed: Name is required',
      jsonb_build_object('name', p_name),
      'database',
      'families',
      'create_family',
      'VALIDATION_ERROR'
    );
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Family name is required',
      'error_code', 'VALIDATION_ERROR'
    );
  END IF;

  IF p_created_by IS NULL THEN
    PERFORM log_error(
      NULL,
      'error',
      'Family creation failed: User not authenticated',
      jsonb_build_object('created_by', p_created_by),
      'database',
      'families',
      'create_family',
      'AUTH_ERROR'
    );
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not authenticated',
      'error_code', 'AUTH_ERROR'
    );
  END IF;

  -- Log the attempt
  log_details := jsonb_build_object(
    'name', p_name,
    'description', p_description,
    'created_by', p_created_by
  );

  PERFORM log_info(
    p_created_by,
    'Attempting to create family',
    log_details,
    'database',
    'families',
    'create_family'
  );

  -- Create the family
  BEGIN
    INSERT INTO families (name, description, created_by)
    VALUES (trim(p_name), p_description, p_created_by)
    RETURNING * INTO family_record;

    -- Add creator as admin member
    INSERT INTO family_members (family_id, user_id, role)
    VALUES (family_record.id, p_created_by, 'admin');

    -- Create default categories
    PERFORM create_default_categories_for_family(family_record.id);

    -- Log success
    PERFORM log_info(
      p_created_by,
      'Family created successfully',
      jsonb_build_object(
        'family_id', family_record.id,
        'family_name', family_record.name,
        'invite_code', family_record.invite_code
      ),
      'database',
      'families',
      'create_family'
    );

    result := jsonb_build_object(
      'success', true,
      'family', row_to_json(family_record)
    );

    RETURN result;

  EXCEPTION 
    WHEN unique_violation THEN
      PERFORM log_error(
        p_created_by,
        'error',
        'Family creation failed: Name already exists',
        log_details || jsonb_build_object('error', 'unique_violation'),
        'database',
        'families',
        'create_family',
        'DUPLICATE_NAME'
      );
      RETURN jsonb_build_object(
        'success', false,
        'error', 'A family with this name already exists',
        'error_code', 'DUPLICATE_NAME'
      );
    
    WHEN OTHERS THEN
      PERFORM log_error(
        p_created_by,
        'error',
        'Family creation failed: ' || SQLERRM,
        log_details || jsonb_build_object(
          'sqlstate', SQLSTATE,
          'sqlerrm', SQLERRM
        ),
        'database',
        'families',
        'create_family',
        'DATABASE_ERROR'
      );
      RETURN jsonb_build_object(
        'success', false,
        'error', 'An unexpected error occurred',
        'error_code', 'DATABASE_ERROR'
      );
  END;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Enable RLS on logs table
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own logs
CREATE POLICY "Users can view own logs" ON logs
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Allow system to insert logs (for server-side logging)
CREATE POLICY "System can insert logs" ON logs
  FOR INSERT WITH CHECK (true);

-- Policy: No updates or deletes on logs (immutable audit trail)
CREATE POLICY "No updates on logs" ON logs
  FOR UPDATE USING (false);

CREATE POLICY "No deletes on logs" ON logs
  FOR DELETE USING (false);

-- Create a view for recent errors (last 24 hours)
CREATE OR REPLACE VIEW recent_errors AS
SELECT 
  l.*,
  p.email,
  p.full_name
FROM logs l
LEFT JOIN profiles p ON l.user_id = p.id
WHERE l.level IN ('error', 'fatal')
  AND l.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY l.created_at DESC;

-- Function to get user's recent logs
CREATE OR REPLACE FUNCTION get_user_logs(
  p_user_id UUID DEFAULT auth.uid(),
  p_limit INTEGER DEFAULT 50,
  p_level VARCHAR DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  level VARCHAR,
  message TEXT,
  details JSONB,
  source VARCHAR,
  module VARCHAR,
  action VARCHAR,
  error_code VARCHAR,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id, l.level, l.message, l.details, l.source, l.module, l.action, l.error_code, l.created_at
  FROM logs l
  WHERE l.user_id = p_user_id
    AND (p_level IS NULL OR l.level = p_level)
  ORDER BY l.created_at DESC
  LIMIT p_limit;
END;
$$ language 'plpgsql' SECURITY DEFINER;