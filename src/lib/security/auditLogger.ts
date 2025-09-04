/**
 * Audit logging utilities for comprehensive financial security tracking
 */

import { supabase } from '@/lib/supabase';
import { createDataChecksum } from './encryption';

export interface AuditLogEntry {
  family_id: string;
  user_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'LOGIN' | 'LOGOUT';
  table_name: string;
  record_id?: string;
  old_data?: any;
  new_data?: any;
  operation_context?: string;
  ip_address?: string;
  user_agent?: string;
  amount?: number;
}

export interface SensitiveOperationEntry {
  family_id: string;
  user_id: string;
  operation_type: string;
  operation_data: any;
  amount?: number;
  requires_approval?: boolean;
}

/**
 * Audit Logger class for comprehensive logging
 */
export class AuditLogger {
  private static instance: AuditLogger;
  private requestContext: RequestContext | null = null;

  private constructor() {}

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Set request context for all subsequent logs
   */
  setRequestContext(context: RequestContext): void {
    this.requestContext = context;
  }

  /**
   * Clear request context
   */
  clearRequestContext(): void {
    this.requestContext = null;
  }

  /**
   * Log a financial operation
   */
  async logFinancialOperation(entry: AuditLogEntry): Promise<string | null> {
    try {
      const context = this.requestContext || {};
      
      // Call the database function for audit logging
      const { data, error } = await supabase.rpc('create_audit_log', {
        p_family_id: entry.family_id,
        p_user_id: entry.user_id,
        p_action: entry.action,
        p_table_name: entry.table_name,
        p_record_id: entry.record_id || null,
        p_old_data: entry.old_data ? JSON.stringify(entry.old_data) : null,
        p_new_data: entry.new_data ? JSON.stringify(entry.new_data) : null,
        p_operation_context: entry.operation_context || null,
        p_ip_address: entry.ip_address || context.ip_address || null,
        p_user_agent: entry.user_agent || context.user_agent || null,
        p_amount: entry.amount || null
      });

      if (error) {
        console.error('Audit log error:', error);
        // Don't throw - we don't want audit failures to break business logic
        return null;
      }

      return data as string;
    } catch (error) {
      console.error('Failed to create audit log:', error);
      return null;
    }
  }

  /**
   * Log transaction operations
   */
  async logTransaction(
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    familyId: string,
    userId: string,
    transactionId: string,
    oldData?: any,
    newData?: any
  ): Promise<void> {
    await this.logFinancialOperation({
      family_id: familyId,
      user_id: userId,
      action,
      table_name: 'transactions',
      record_id: transactionId,
      old_data: oldData,
      new_data: newData,
      operation_context: 'transaction-management',
      amount: newData?.amount || oldData?.amount
    });
  }

  /**
   * Log budget operations
   */
  async logBudget(
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    familyId: string,
    userId: string,
    budgetId: string,
    oldData?: any,
    newData?: any
  ): Promise<void> {
    await this.logFinancialOperation({
      family_id: familyId,
      user_id: userId,
      action,
      table_name: 'budgets',
      record_id: budgetId,
      old_data: oldData,
      new_data: newData,
      operation_context: 'budget-management',
      amount: newData?.amount || oldData?.amount
    });
  }

  /**
   * Log account operations
   */
  async logAccount(
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    familyId: string,
    userId: string,
    accountId: string,
    oldData?: any,
    newData?: any
  ): Promise<void> {
    await this.logFinancialOperation({
      family_id: familyId,
      user_id: userId,
      action,
      table_name: 'financial_accounts',
      record_id: accountId,
      old_data: oldData,
      new_data: newData,
      operation_context: 'account-management',
      amount: Math.abs((newData?.balance || 0) - (oldData?.balance || 0))
    });
  }

  /**
   * Log recurring transaction operations
   */
  async logRecurringTransaction(
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    familyId: string,
    userId: string,
    recurringTransactionId: string,
    oldData?: any,
    newData?: any
  ): Promise<void> {
    await this.logFinancialOperation({
      family_id: familyId,
      user_id: userId,
      action,
      table_name: 'recurring_transactions',
      record_id: recurringTransactionId,
      old_data: oldData,
      new_data: newData,
      operation_context: 'recurring-transaction-management',
      amount: newData?.amount || oldData?.amount || 0
    });
  }

  /**
   * Log recurring transaction execution
   */
  async logRecurringTransactionExecution(
    familyId: string,
    userId: string,
    recurringTransactionId: string,
    executionData: {
      scheduled_date: string;
      execution_status: string;
      transaction_id?: string;
      error_message?: string;
      amount: number;
    }
  ): Promise<void> {
    const riskLevel = executionData.execution_status === 'failed' ? 'HIGH' : 
                     executionData.amount > 1000 ? 'MEDIUM' : 'LOW';

    await this.logFinancialOperation({
      family_id: familyId,
      user_id: userId,
      action: 'EXECUTE',
      table_name: 'recurring_transaction_executions',
      record_id: recurringTransactionId,
      new_data: executionData,
      operation_context: 'automated-recurring-execution',
      amount: executionData.amount,
      risk_level: riskLevel
    });
  }

  /**
   * Log bulk recurring transaction processing
   */
  async logBulkRecurringProcessing(
    processingResult: {
      processed_count: number;
      failed_count: number;
      error_messages: string[];
      families_affected: string[];
      total_amount_processed: number;
    }
  ): Promise<void> {
    const riskLevel = processingResult.failed_count > 0 ? 'HIGH' :
                     processingResult.total_amount_processed > 10000 ? 'MEDIUM' : 'LOW';

    await this.logFinancialOperation({
      family_id: processingResult.families_affected[0] || '00000000-0000-0000-0000-000000000000',
      user_id: '00000000-0000-0000-0000-000000000000', // System user for automated processing
      action: 'BULK_PROCESS',
      table_name: 'recurring_transactions',
      record_id: 'bulk_processing_' + Date.now(),
      new_data: processingResult,
      operation_context: 'automated-bulk-processing',
      amount: processingResult.total_amount_processed,
      risk_level: riskLevel
    });
  }

  /**
   * Log security events
   */
  async logSecurityEvent(
    familyId: string,
    userId: string,
    eventType: string,
    eventData: any
  ): Promise<void> {
    await this.logFinancialOperation({
      family_id: familyId,
      user_id: userId,
      action: 'VIEW', // Security events are typically viewing/access attempts
      table_name: 'security_events',
      operation_context: eventType,
      new_data: eventData
    });
  }

  /**
   * Log user authentication
   */
  async logAuthentication(
    userId: string,
    action: 'LOGIN' | 'LOGOUT',
    familyId?: string
  ): Promise<void> {
    await this.logFinancialOperation({
      family_id: familyId || 'system',
      user_id: userId,
      action,
      table_name: 'auth_events',
      operation_context: 'user-authentication'
    });
  }

  /**
   * Create data integrity checksum
   */
  async createDataChecksum(
    tableName: string,
    recordId: string,
    familyId: string,
    data: any
  ): Promise<void> {
    try {
      const checksum = createDataChecksum(data);
      
      const { error } = await supabase.rpc('generate_data_checksum', {
        p_table_name: tableName,
        p_record_id: recordId,
        p_family_id: familyId,
        p_data: JSON.stringify(data)
      });

      if (error) {
        console.error('Failed to create data checksum:', error);
      }
    } catch (error) {
      console.error('Data checksum creation error:', error);
    }
  }

  /**
   * Get audit logs for a family
   */
  async getAuditLogs(
    familyId: string,
    options: {
      limit?: number;
      offset?: number;
      action?: string;
      table_name?: string;
      risk_level?: string;
      start_date?: string;
      end_date?: string;
    } = {}
  ): Promise<any[]> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });

      if (options.action) {
        query = query.eq('action', options.action);
      }

      if (options.table_name) {
        query = query.eq('table_name', options.table_name);
      }

      if (options.risk_level) {
        query = query.eq('risk_level', options.risk_level);
      }

      if (options.start_date) {
        query = query.gte('created_at', options.start_date);
      }

      if (options.end_date) {
        query = query.lte('created_at', options.end_date);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get audit logs:', error);
      return [];
    }
  }

  /**
   * Get security dashboard data
   */
  async getSecurityDashboard(familyId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('security_dashboard')
        .select('*')
        .eq('family_id', familyId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is OK
        throw error;
      }

      return data || {
        total_operations: 0,
        critical_operations: 0,
        high_risk_operations: 0,
        operations_last_24h: 0,
        high_risk_last_24h: 0,
        last_operation: null,
        avg_amount_involved: 0
      };
    } catch (error) {
      console.error('Failed to get security dashboard:', error);
      return null;
    }
  }

  /**
   * Get sensitive operations requiring approval
   */
  async getPendingApprovals(familyId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('sensitive_operations_log')
        .select('*')
        .eq('family_id', familyId)
        .eq('requires_approval', true)
        .is('approved_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get pending approvals:', error);
      return [];
    }
  }
}

/**
 * Request context for audit logging
 */
export interface RequestContext {
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
}

/**
 * Audit logging decorator for async functions
 */
export function auditLog(
  tableName: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  context?: string
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const logger = AuditLogger.getInstance();
      const result = await method.apply(this, args);

      // Extract audit information from result or arguments
      const auditInfo = extractAuditInfo(args, result);
      
      if (auditInfo.familyId && auditInfo.userId) {
        await logger.logFinancialOperation({
          family_id: auditInfo.familyId,
          user_id: auditInfo.userId,
          action,
          table_name: tableName,
          record_id: auditInfo.recordId,
          old_data: auditInfo.oldData,
          new_data: auditInfo.newData,
          operation_context: context
        });
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Helper function to extract audit information
 */
function extractAuditInfo(args: any[], result: any): {
  familyId?: string;
  userId?: string;
  recordId?: string;
  oldData?: any;
  newData?: any;
} {
  // This would be implemented based on your specific function signatures
  // For now, returning empty object
  return {};
}

/**
 * Singleton instance
 */
export const auditLogger = AuditLogger.getInstance();

export default auditLogger;