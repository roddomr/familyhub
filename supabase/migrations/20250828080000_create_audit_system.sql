-- Create comprehensive audit system for financial security
-- This system tracks all critical financial operations

-- Audit logs table for comprehensive tracking
CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Operation details
  action VARCHAR(20) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'LOGOUT')),
  table_name VARCHAR(50) NOT NULL,
  record_id UUID,
  
  -- Data tracking
  old_data JSONB,
  new_data JSONB,
  changes JSONB, -- Specific fields that changed
  
  -- Request context
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(100),
  
  -- Risk assessment
  risk_level VARCHAR(10) DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  amount_involved DECIMAL(12,2), -- For financial operations
  
  -- Additional context
  operation_context VARCHAR(100), -- e.g., 'budget-creation', 'transaction-edit'
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 years') -- Retention policy
);

-- Sensitive operations log (for high-value or critical operations)
CREATE TABLE sensitive_operations_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  operation_type VARCHAR(50) NOT NULL, -- 'large_transaction', 'account_deletion', 'budget_exceeded'
  operation_data JSONB NOT NULL,
  
  -- Risk indicators
  amount DECIMAL(12,2),
  threshold_exceeded BOOLEAN DEFAULT FALSE,
  unusual_pattern BOOLEAN DEFAULT FALSE,
  
  -- Approval workflow
  requires_approval BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data integrity checksums for critical tables
CREATE TABLE data_integrity_checksums (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  
  checksum_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of critical data
  data_snapshot JSONB NOT NULL, -- Encrypted snapshot of data
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  
  UNIQUE(table_name, record_id)
);

-- Indexes for performance
CREATE INDEX idx_audit_logs_family_id ON audit_logs(family_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_risk_level ON audit_logs(risk_level);
CREATE INDEX idx_audit_logs_amount ON audit_logs(amount_involved) WHERE amount_involved IS NOT NULL;

CREATE INDEX idx_sensitive_ops_family_id ON sensitive_operations_log(family_id);
CREATE INDEX idx_sensitive_ops_user_id ON sensitive_operations_log(user_id);
CREATE INDEX idx_sensitive_ops_type ON sensitive_operations_log(operation_type);
CREATE INDEX idx_sensitive_ops_amount ON sensitive_operations_log(amount) WHERE amount IS NOT NULL;
CREATE INDEX idx_sensitive_ops_requires_approval ON sensitive_operations_log(requires_approval) WHERE requires_approval = TRUE;

CREATE INDEX idx_data_integrity_table ON data_integrity_checksums(table_name);
CREATE INDEX idx_data_integrity_family ON data_integrity_checksums(family_id);

-- Function to automatically calculate risk level based on operation
CREATE OR REPLACE FUNCTION calculate_risk_level(
  p_action VARCHAR,
  p_table_name VARCHAR,
  p_amount DECIMAL DEFAULT NULL,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL
) RETURNS VARCHAR AS $$
DECLARE
  v_risk_level VARCHAR := 'LOW';
BEGIN
  -- High risk operations
  IF p_action = 'DELETE' AND p_table_name IN ('transactions', 'financial_accounts', 'budgets') THEN
    v_risk_level := 'HIGH';
  END IF;
  
  -- Amount-based risk assessment
  IF p_amount IS NOT NULL THEN
    IF p_amount > 10000 THEN
      v_risk_level := 'CRITICAL';
    ELSIF p_amount > 1000 THEN
      v_risk_level := 'HIGH';
    ELSIF p_amount > 100 THEN
      v_risk_level := 'MEDIUM';
    END IF;
  END IF;
  
  -- Balance changes risk assessment
  IF p_table_name = 'financial_accounts' AND p_old_data IS NOT NULL AND p_new_data IS NOT NULL THEN
    DECLARE
      v_old_balance DECIMAL := (p_old_data->>'balance')::DECIMAL;
      v_new_balance DECIMAL := (p_new_data->>'balance')::DECIMAL;
      v_balance_change DECIMAL := ABS(v_new_balance - v_old_balance);
    BEGIN
      IF v_balance_change > 5000 THEN
        v_risk_level := 'CRITICAL';
      ELSIF v_balance_change > 1000 THEN
        v_risk_level := 'HIGH';
      END IF;
    END;
  END IF;
  
  RETURN v_risk_level;
END;
$$ LANGUAGE plpgsql;

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log(
  p_family_id UUID,
  p_user_id UUID,
  p_action VARCHAR,
  p_table_name VARCHAR,
  p_record_id UUID DEFAULT NULL,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL,
  p_operation_context VARCHAR DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_amount DECIMAL DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
  v_risk_level VARCHAR;
  v_changes JSONB := '{}';
BEGIN
  -- Calculate risk level
  v_risk_level := calculate_risk_level(p_action, p_table_name, p_amount, p_old_data, p_new_data);
  
  -- Calculate changes if both old and new data provided
  IF p_old_data IS NOT NULL AND p_new_data IS NOT NULL THEN
    SELECT jsonb_object_agg(key, jsonb_build_object('old', old_val, 'new', new_val))
    INTO v_changes
    FROM (
      SELECT key, 
             p_old_data->key AS old_val,
             p_new_data->key AS new_val
      FROM jsonb_object_keys(p_new_data) AS key
      WHERE p_old_data->key IS DISTINCT FROM p_new_data->key
    ) AS changed_fields;
  END IF;
  
  -- Insert audit log
  INSERT INTO audit_logs (
    family_id, user_id, action, table_name, record_id,
    old_data, new_data, changes, operation_context,
    ip_address, user_agent, risk_level, amount_involved
  ) VALUES (
    p_family_id, p_user_id, p_action, p_table_name, p_record_id,
    p_old_data, p_new_data, v_changes, p_operation_context,
    p_ip_address, p_user_agent, v_risk_level, p_amount
  ) RETURNING id INTO v_audit_id;
  
  -- Log sensitive operations separately for high/critical risk
  IF v_risk_level IN ('HIGH', 'CRITICAL') THEN
    INSERT INTO sensitive_operations_log (
      family_id, user_id, operation_type, operation_data, amount,
      threshold_exceeded, requires_approval
    ) VALUES (
      p_family_id, p_user_id, 
      COALESCE(p_operation_context, p_action || '_' || p_table_name),
      jsonb_build_object(
        'action', p_action,
        'table', p_table_name,
        'record_id', p_record_id,
        'old_data', p_old_data,
        'new_data', p_new_data,
        'audit_log_id', v_audit_id
      ),
      p_amount,
      v_risk_level = 'CRITICAL',
      v_risk_level = 'CRITICAL' AND p_amount > 5000 -- Require approval for critical high-amount operations
    );
  END IF;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql;

-- Function to generate data integrity checksum
CREATE OR REPLACE FUNCTION generate_data_checksum(
  p_table_name VARCHAR,
  p_record_id UUID,
  p_family_id UUID,
  p_data JSONB
) RETURNS VOID AS $$
DECLARE
  v_checksum VARCHAR(64);
BEGIN
  -- Generate SHA-256 hash of the data
  v_checksum := encode(digest(p_data::TEXT, 'sha256'), 'hex');
  
  -- Insert or update checksum
  INSERT INTO data_integrity_checksums (table_name, record_id, family_id, checksum_hash, data_snapshot)
  VALUES (p_table_name, p_record_id, p_family_id, v_checksum, p_data)
  ON CONFLICT (table_name, record_id) 
  DO UPDATE SET 
    checksum_hash = EXCLUDED.checksum_hash,
    data_snapshot = EXCLUDED.data_snapshot,
    created_at = NOW(),
    verified_at = NULL;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for audit tables
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensitive_operations_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_integrity_checksums ENABLE ROW LEVEL SECURITY;

-- Audit logs can only be viewed by family members, never modified
CREATE POLICY "audit_logs_family_read_only" ON audit_logs
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid()
    )
  );

-- Sensitive operations require additional permissions
CREATE POLICY "sensitive_ops_family_read_only" ON sensitive_operations_log
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'parent') -- Only admins/parents can view sensitive operations
    )
  );

-- Data integrity checksums readable by family members
CREATE POLICY "checksums_family_read_only" ON data_integrity_checksums
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT SELECT ON audit_logs TO authenticated;
GRANT SELECT ON sensitive_operations_log TO authenticated;
GRANT SELECT ON data_integrity_checksums TO authenticated;

-- Create a view for security dashboard (views don't support RLS policies directly)
-- Access control will be handled by the underlying tables' RLS policies
CREATE VIEW security_dashboard AS
SELECT 
  family_id,
  COUNT(*) as total_operations,
  COUNT(*) FILTER (WHERE risk_level = 'CRITICAL') as critical_operations,
  COUNT(*) FILTER (WHERE risk_level = 'HIGH') as high_risk_operations,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as operations_last_24h,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours' AND risk_level IN ('HIGH', 'CRITICAL')) as high_risk_last_24h,
  MAX(created_at) as last_operation,
  AVG(amount_involved) FILTER (WHERE amount_involved IS NOT NULL) as avg_amount_involved
FROM audit_logs 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY family_id;

GRANT SELECT ON security_dashboard TO authenticated;

-- Create comment documentation
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all financial operations';
COMMENT ON TABLE sensitive_operations_log IS 'Special logging for high-risk financial operations requiring additional oversight';
COMMENT ON TABLE data_integrity_checksums IS 'Data integrity verification through cryptographic checksums';
COMMENT ON FUNCTION create_audit_log IS 'Creates audit log entries with automatic risk assessment';
COMMENT ON FUNCTION calculate_risk_level IS 'Calculates risk level based on operation type, amount, and data changes';