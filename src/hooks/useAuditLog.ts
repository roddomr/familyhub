/**
 * React hook for audit logging in financial operations
 */

import { useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/hooks/useFamily';
import { auditLogger, type AuditLogEntry } from '@/lib/security/auditLogger';
import { SECURITY_THRESHOLDS } from '@/lib/security/encryption';

interface UseAuditLogReturn {
  logTransaction: (action: 'CREATE' | 'UPDATE' | 'DELETE', transactionData: any, oldData?: any) => Promise<void>;
  logBudget: (action: 'CREATE' | 'UPDATE' | 'DELETE', budgetData: any, oldData?: any) => Promise<void>;
  logAccount: (action: 'CREATE' | 'UPDATE' | 'DELETE', accountData: any, oldData?: any) => Promise<void>;
  logRecurringTransaction: (action: 'CREATE' | 'UPDATE' | 'DELETE', recurringTransactionData: any, oldData?: any) => Promise<void>;
  logRecurringTransactionExecution: (recurringTransactionId: string, executionData: any) => Promise<void>;
  logBulkRecurringProcessing: (processingResult: any) => Promise<void>;
  logSecurityEvent: (eventType: string, eventData: any) => Promise<void>;
  logSuspiciousActivity: (activityType: string, details: any) => Promise<void>;
  getAuditHistory: (options?: any) => Promise<any[]>;
  getSecurityDashboard: () => Promise<any>;
}

export const useAuditLog = (): UseAuditLogReturn => {
  const { user } = useAuth();
  const { currentFamily } = useFamily();

  // Set request context on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      auditLogger.setRequestContext({
        user_agent: navigator.userAgent,
        // IP address would need to be obtained from a service in production
        ip_address: undefined, 
        session_id: sessionStorage.getItem('session_id') || undefined
      });
    }

    return () => {
      auditLogger.clearRequestContext();
    };
  }, []);

  /**
   * Log suspicious activity with additional metadata
   */
  const logSuspiciousActivity = useCallback(async (
    activityType: string,
    details: any
  ) => {
    if (!user || !currentFamily) return;

    try {
      await auditLogger.logFinancialOperation({
        family_id: currentFamily.id,
        user_id: user.id,
        action: 'VIEW', // Suspicious activities are typically viewing/access patterns
        table_name: 'suspicious_activities',
        operation_context: activityType,
        new_data: {
          ...details,
          detected_at: new Date().toISOString(),
          risk_factors: calculateRiskFactors(activityType, details)
        }
      });
    } catch (error) {
      console.warn('Suspicious activity logging failed (non-critical):', error);
    }
  }, [user, currentFamily]);

  /**
   * Log transaction operations with automatic risk assessment
   */
  const logTransaction = useCallback(async (
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    transactionData: any,
    oldData?: any
  ) => {
    // Always log to console first
    console.log(`[AUDIT] ${action} transaction:`, transactionData);
    
    if (!user || !currentFamily) return;

    try {
      await auditLogger.logTransaction(
        action,
        currentFamily.id,
        user.id,
        transactionData.id,
        oldData,
        transactionData
      );

      // Check for suspicious patterns
      if (transactionData.amount > SECURITY_THRESHOLDS.LARGE_TRANSACTION) {
        await logSuspiciousActivity('large_transaction', {
          amount: transactionData.amount,
          transaction_id: transactionData.id,
          threshold: SECURITY_THRESHOLDS.LARGE_TRANSACTION
        });
      }

      // Create data integrity checksum for critical transactions
      if (transactionData.amount > SECURITY_THRESHOLDS.CRITICAL_TRANSACTION) {
        await auditLogger.createDataChecksum(
          'transactions',
          transactionData.id,
          currentFamily.id,
          transactionData
        );
      }
    } catch (error) {
      console.warn('Audit logging failed (non-critical):', error);
    }
  }, [user, currentFamily, logSuspiciousActivity]);

  /**
   * Log budget operations
   */
  const logBudget = useCallback(async (
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    budgetData: any,
    oldData?: any
  ) => {
    if (!user || !currentFamily) return;

    try {
      await auditLogger.logBudget(
        action,
        currentFamily.id,
        user.id,
        budgetData.id,
        oldData,
        budgetData
      );

      // Log significant budget changes
      if (oldData && budgetData && action === 'UPDATE') {
        const oldAmount = oldData.amount || 0;
        const newAmount = budgetData.amount || 0;
        const changePercent = Math.abs((newAmount - oldAmount) / oldAmount);
        
        if (changePercent > 0.5) { // 50% change
          await logSuspiciousActivity('significant_budget_change', {
            budget_id: budgetData.id,
            old_amount: oldAmount,
            new_amount: newAmount,
            change_percent: changePercent
          });
        }
      }
    } catch (error) {
      console.warn('Budget audit logging failed (non-critical):', error);
    }
  }, [user, currentFamily, logSuspiciousActivity]);

  /**
   * Log account operations
   */
  const logAccount = useCallback(async (
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    accountData: any,
    oldData?: any
  ) => {
    if (!user || !currentFamily) return;

    try {
      await auditLogger.logAccount(
        action,
        currentFamily.id,
        user.id,
        accountData.id,
        oldData,
        accountData
      );

      // Log significant balance changes
      if (oldData && accountData && action === 'UPDATE') {
        const balanceChange = Math.abs((accountData.balance || 0) - (oldData.balance || 0));
        
        if (balanceChange > SECURITY_THRESHOLDS.LARGE_TRANSACTION) {
          await logSuspiciousActivity('significant_balance_change', {
            account_id: accountData.id,
            old_balance: oldData.balance,
            new_balance: accountData.balance,
            change_amount: balanceChange
          });
        }
      }

      // Create checksum for account data
      if (accountData.id) {
        await auditLogger.createDataChecksum(
          'financial_accounts',
          accountData.id,
          currentFamily.id,
          accountData
        );
      }
    } catch (error) {
      console.warn('Account audit logging failed (non-critical):', error);
    }
  }, [user, currentFamily, logSuspiciousActivity]);

  /**
   * Log security events
   */
  const logSecurityEvent = useCallback(async (
    eventType: string,
    eventData: any
  ) => {
    if (!user || !currentFamily) return;

    try {
      await auditLogger.logSecurityEvent(
        currentFamily.id,
        user.id,
        eventType,
        eventData
      );
    } catch (error) {
      console.warn('Security event logging failed (non-critical):', error);
    }
  }, [user, currentFamily]);

  /**
   * Get audit history for current family
   */
  const getAuditHistory = useCallback(async (options?: any) => {
    if (!currentFamily) return [];

    try {
      return await auditLogger.getAuditLogs(currentFamily.id, options);
    } catch (error) {
      console.error('Failed to get audit history:', error);
      return [];
    }
  }, [currentFamily]);

  /**
   * Get security dashboard data
   */
  /**
   * Log recurring transaction operations
   */
  const logRecurringTransaction = useCallback(async (
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    recurringTransactionData: any,
    oldData?: any
  ) => {
    if (!user || !currentFamily) return;

    try {
      await auditLogger.logRecurringTransaction(
        action,
        currentFamily.id,
        user.id,
        recurringTransactionData.id,
        oldData,
        recurringTransactionData
      );

      // Check for suspicious patterns in recurring transactions
      if (recurringTransactionData.amount > SECURITY_THRESHOLDS.LARGE_TRANSACTION) {
        await logSuspiciousActivity('large_recurring_transaction', {
          amount: recurringTransactionData.amount,
          recurring_transaction_id: recurringTransactionData.id,
          frequency: recurringTransactionData.frequency,
          threshold: SECURITY_THRESHOLDS.LARGE_TRANSACTION
        });
      }
    } catch (error) {
      console.error('Failed to log recurring transaction audit:', error);
    }
  }, [user, currentFamily, logSuspiciousActivity]);

  /**
   * Log recurring transaction execution
   */
  const logRecurringTransactionExecution = useCallback(async (
    recurringTransactionId: string,
    executionData: any
  ) => {
    if (!user || !currentFamily) return;

    try {
      await auditLogger.logRecurringTransactionExecution(
        currentFamily.id,
        user.id,
        recurringTransactionId,
        executionData
      );
    } catch (error) {
      console.error('Failed to log recurring transaction execution:', error);
    }
  }, [user, currentFamily]);

  /**
   * Log bulk recurring processing results
   */
  const logBulkRecurringProcessing = useCallback(async (
    processingResult: any
  ) => {
    try {
      await auditLogger.logBulkRecurringProcessing(processingResult);
    } catch (error) {
      console.error('Failed to log bulk recurring processing:', error);
    }
  }, []);

  const getSecurityDashboard = useCallback(async () => {
    if (!currentFamily) return null;

    try {
      return await auditLogger.getSecurityDashboard(currentFamily.id);
    } catch (error) {
      console.error('Failed to get security dashboard:', error);
      return null;
    }
  }, [currentFamily]);

  return {
    logTransaction,
    logBudget,
    logAccount,
    logRecurringTransaction,
    logRecurringTransactionExecution,
    logBulkRecurringProcessing,
    logSecurityEvent,
    logSuspiciousActivity,
    getAuditHistory,
    getSecurityDashboard
  };
};

/**
 * Calculate risk factors for suspicious activities
 */
function calculateRiskFactors(activityType: string, details: any): string[] {
  const riskFactors: string[] = [];

  switch (activityType) {
    case 'large_transaction':
      if (details.amount > SECURITY_THRESHOLDS.CRITICAL_TRANSACTION) {
        riskFactors.push('critical_amount');
      }
      break;
    
    case 'significant_balance_change':
      if (details.change_amount > SECURITY_THRESHOLDS.CRITICAL_TRANSACTION) {
        riskFactors.push('critical_balance_change');
      }
      break;
    
    case 'rapid_transactions':
      riskFactors.push('high_frequency');
      break;
    
    case 'unusual_time':
      riskFactors.push('off_hours_activity');
      break;
    
    default:
      riskFactors.push('general_suspicious');
  }

  return riskFactors;
}

export default useAuditLog;