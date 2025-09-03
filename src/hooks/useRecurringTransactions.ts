/**
 * React hook for managing recurring transactions
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useFamily } from '@/hooks/useFamily';
import { useAuth } from '@/contexts/AuthContext';
import { useLogger } from '@/hooks/useLogger';
import { useAuditLog } from '@/hooks/useAuditLog';
import { retrySupabaseOperation, getSupabaseErrorMessage, SupabaseConnectionError } from '@/utils/supabaseErrorHandler';
import {
  RecurringTransaction,
  RecurringTransactionExecution,
  CreateRecurringTransactionData,
  UpdateRecurringTransactionData,
  RecurringTransactionFilters,
  UpcomingRecurringTransaction,
  ProcessRecurringTransactionsResult
} from '@/types/recurring';

interface UseRecurringTransactionsReturn {
  recurringTransactions: RecurringTransaction[];
  upcomingTransactions: UpcomingRecurringTransaction[];
  executions: RecurringTransactionExecution[];
  loading: boolean;
  error: string | null;
  
  // CRUD operations
  createRecurringTransaction: (data: CreateRecurringTransactionData) => Promise<RecurringTransaction | null>;
  updateRecurringTransaction: (id: string, data: UpdateRecurringTransactionData) => Promise<boolean>;
  deleteRecurringTransaction: (id: string) => Promise<boolean>;
  toggleRecurringTransaction: (id: string, isActive: boolean) => Promise<boolean>;
  
  // Data fetching
  fetchRecurringTransactions: (filters?: RecurringTransactionFilters, forceRefresh?: boolean) => Promise<void>;
  fetchUpcomingTransactions: (daysAhead?: number) => Promise<void>;
  fetchExecutionHistory: (recurringTransactionId?: string) => Promise<void>;
  
  // Processing
  processRecurringTransactions: () => Promise<ProcessRecurringTransactionsResult | null>;
  
  // Utilities
  getRecurringTransaction: (id: string) => RecurringTransaction | undefined;
  getNextExecutionDate: (recurringTransaction: RecurringTransaction) => Date;
}

export const useRecurringTransactions = (): UseRecurringTransactionsReturn => {
  const { currentFamily } = useFamily();
  const { user } = useAuth();
  const { logInfo, logError } = useLogger();
  const { logSecurityEvent, logRecurringTransaction, logRecurringTransactionExecution } = useAuditLog();

  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [upcomingTransactions, setUpcomingTransactions] = useState<UpcomingRecurringTransaction[]>([]);
  const [executions, setExecutions] = useState<RecurringTransactionExecution[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  // Create recurring transaction
  const createRecurringTransaction = useCallback(async (
    data: CreateRecurringTransactionData
  ): Promise<RecurringTransaction | null> => {
    if (!currentFamily || !user) {
      setError('Missing family or user context');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      await logInfo('Creating recurring transaction', {
        family_id: currentFamily.id,
        data: { ...data, amount: '***' } // Mask amount for security
      }, 'finance', 'create_recurring_transaction');

      const { data: result, error } = await supabase
        .from('recurring_transactions')
        .insert({
          family_id: currentFamily.id,
          created_by: user.id,
          ...data,
          next_execution_date: data.start_date
        })
        .select(`
          *,
          account:financial_accounts(name, type, balance),
          category:transaction_categories(name, color, icon)
        `)
        .single();

      if (error) {
        await logError('Failed to create recurring transaction', {
          error: error.message,
          code: error.code
        }, 'finance', 'create_recurring_transaction', 'DATABASE_ERROR');
        throw error;
      }

      // Log security audit for the creation
      await logRecurringTransaction('CREATE', result);

      // Log security event for large amounts
      if (data.amount > 1000) {
        await logSecurityEvent('large_recurring_transaction_created', {
          recurring_transaction_id: result.id,
          amount: data.amount,
          frequency: data.frequency
        });
      }

      await logInfo('Recurring transaction created successfully', {
        recurring_transaction_id: result.id
      }, 'finance', 'create_recurring_transaction');

      // Add to local state
      setRecurringTransactions(prev => [...prev, result]);
      
      return result;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to create recurring transaction';
      setError(errorMsg);
      await logError('Unexpected error creating recurring transaction', {
        error: errorMsg,
        stack: err.stack
      }, 'finance', 'create_recurring_transaction', 'UNEXPECTED_ERROR');
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentFamily, user, logInfo, logError, logSecurityEvent]);

  // Update recurring transaction
  const updateRecurringTransaction = useCallback(async (
    id: string,
    data: UpdateRecurringTransactionData
  ): Promise<boolean> => {
    if (!currentFamily) {
      setError('Missing family context');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      await logInfo('Updating recurring transaction', {
        recurring_transaction_id: id,
        updates: { ...data, amount: data.amount ? '***' : undefined }
      }, 'finance', 'update_recurring_transaction');

      const { error } = await supabase
        .from('recurring_transactions')
        .update(data)
        .eq('id', id)
        .eq('family_id', currentFamily.id);

      if (error) {
        await logError('Failed to update recurring transaction', {
          error: error.message,
          recurring_transaction_id: id
        }, 'finance', 'update_recurring_transaction', 'DATABASE_ERROR');
        throw error;
      }

      // Log security audit for the update
      const existingTransaction = recurringTransactions.find(rt => rt.id === id);
      if (existingTransaction) {
        await logRecurringTransaction('UPDATE', { ...existingTransaction, ...data }, existingTransaction);
      }

      // Update local state
      setRecurringTransactions(prev =>
        prev.map(rt => rt.id === id ? { ...rt, ...data } : rt)
      );

      await logInfo('Recurring transaction updated successfully', {
        recurring_transaction_id: id
      }, 'finance', 'update_recurring_transaction');

      return true;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to update recurring transaction';
      setError(errorMsg);
      await logError('Unexpected error updating recurring transaction', {
        error: errorMsg,
        recurring_transaction_id: id
      }, 'finance', 'update_recurring_transaction', 'UNEXPECTED_ERROR');
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentFamily, logInfo, logError]);

  // Delete recurring transaction
  const deleteRecurringTransaction = useCallback(async (id: string): Promise<boolean> => {
    if (!currentFamily) {
      setError('Missing family context');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      await logInfo('Deleting recurring transaction', {
        recurring_transaction_id: id
      }, 'finance', 'delete_recurring_transaction');

      const { error } = await supabase
        .from('recurring_transactions')
        .delete()
        .eq('id', id)
        .eq('family_id', currentFamily.id);

      if (error) {
        await logError('Failed to delete recurring transaction', {
          error: error.message,
          recurring_transaction_id: id
        }, 'finance', 'delete_recurring_transaction', 'DATABASE_ERROR');
        throw error;
      }

      // Log security audit for the deletion
      const deletedTransaction = recurringTransactions.find(rt => rt.id === id);
      if (deletedTransaction) {
        await logRecurringTransaction('DELETE', deletedTransaction, deletedTransaction);
      }

      // Update local state
      setRecurringTransactions(prev => prev.filter(rt => rt.id !== id));

      await logInfo('Recurring transaction deleted successfully', {
        recurring_transaction_id: id
      }, 'finance', 'delete_recurring_transaction');

      return true;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to delete recurring transaction';
      setError(errorMsg);
      await logError('Unexpected error deleting recurring transaction', {
        error: errorMsg,
        recurring_transaction_id: id
      }, 'finance', 'delete_recurring_transaction', 'UNEXPECTED_ERROR');
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentFamily, logInfo, logError]);

  // Toggle recurring transaction active status
  const toggleRecurringTransaction = useCallback(async (
    id: string,
    isActive: boolean
  ): Promise<boolean> => {
    return await updateRecurringTransaction(id, { is_active: isActive });
  }, [updateRecurringTransaction]);

  // Fetch recurring transactions
  const fetchRecurringTransactions = useCallback(async (
    filters?: RecurringTransactionFilters,
    forceRefresh = false
  ) => {
    if (!currentFamily) return;

    // Throttle requests - don't fetch if we fetched recently (unless forced)
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime;
    const throttleTime = 2000; // 2 seconds

    if (!forceRefresh && timeSinceLastFetch < throttleTime) {
      console.log(`Throttling fetch request - ${Math.round(timeSinceLastFetch/1000)}s since last fetch (need ${throttleTime/1000}s)`);
      return;
    }

    setLoading(true);
    setError(null);
    setLastFetchTime(now);

    try {
      const result = await retrySupabaseOperation(async () => {
        // Test basic table access first
        const { data: testResult, error: testError } = await supabase.rpc('test_recurring_transactions_access');
        
        if (testError) {
          console.error('Table access test failed:', testError);
        } else {
          console.log('Table access test result:', testResult);
        }
        
        // Query with account and category relationships
        let query = supabase
          .from('recurring_transactions')
          .select(`
            *,
            account:financial_accounts(name, type, balance),
            category:transaction_categories(name, color, icon)
          `)
          .eq('family_id', currentFamily.id)
          .order('next_execution_date', { ascending: true });

      // Apply filters
      if (filters?.account_id) {
        query = query.eq('account_id', filters.account_id);
      }
      if (filters?.category_id) {
        query = query.eq('category_id', filters.category_id);
      }
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.frequency) {
        query = query.eq('frequency', filters.frequency);
      }
        if (filters?.is_active !== undefined) {
          query = query.eq('is_active', filters.is_active);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Supabase error details:', error);
          await logError('Failed to fetch recurring transactions', {
            error: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            filters,
            query: 'recurring_transactions with relations'
          }, 'finance', 'fetch_recurring_transactions', 'DATABASE_ERROR');
          throw error;
        }

        return data || [];
      }, { maxRetries: 3, delay: 1000 });

      console.log('Recurring transactions fetched successfully:', result);
      setRecurringTransactions(result);
    } catch (err: any) {
      const userFriendlyMessage = getSupabaseErrorMessage(err);
      console.error('Full error object:', err);
      setError(userFriendlyMessage);
      
      if (err instanceof SupabaseConnectionError) {
        await logError('Connection error fetching recurring transactions', {
          error: userFriendlyMessage,
          originalError: err.originalError?.message
        }, 'finance', 'fetch_recurring_transactions', 'CONNECTION_ERROR');
      } else {
        await logError('Unexpected error fetching recurring transactions', {
          error: userFriendlyMessage,
          stack: err.stack,
          name: err.name
        }, 'finance', 'fetch_recurring_transactions', 'UNEXPECTED_ERROR');
      }
    } finally {
      setLoading(false);
    }
  }, [currentFamily, logError]);

  // Fetch upcoming transactions
  const fetchUpcomingTransactions = useCallback(async (daysAhead: number = 30) => {
    if (!currentFamily) return;

    setLoading(true);
    setError(null);

    try {
      // Calculate future date
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);
      
      // Use direct query instead of RPC for better compatibility
      const { data, error } = await supabase
        .from('recurring_transactions')
        .select(`
          id,
          description,
          amount,
          type,
          frequency,
          next_execution_date,
          account:financial_accounts(name),
          category:transaction_categories(name)
        `)
        .eq('family_id', currentFamily.id)
        .eq('is_active', true)
        .lte('next_execution_date', futureDate.toISOString().split('T')[0])
        .order('next_execution_date', { ascending: true });

      if (error) {
        await logError('Failed to fetch upcoming transactions', {
          error: error.message,
          code: error.code,
          days_ahead: daysAhead
        }, 'finance', 'fetch_upcoming_transactions', 'DATABASE_ERROR');
        throw error;
      }

      // Transform data to match expected format
      const transformedData = (data || []).map(item => ({
        recurring_transaction_id: item.id,
        description: item.description,
        amount: item.amount,
        type: item.type,
        frequency: item.frequency,
        next_date: item.next_execution_date,
        account_name: item.account?.name || 'Unknown Account',
        category_name: item.category?.name || null
      }));

      setUpcomingTransactions(transformedData);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch upcoming transactions';
      setError(errorMsg);
      await logError('Unexpected error fetching upcoming transactions', {
        error: errorMsg,
        stack: err.stack
      }, 'finance', 'fetch_upcoming_transactions', 'UNEXPECTED_ERROR');
    } finally {
      setLoading(false);
    }
  }, [currentFamily, logError]);

  // Fetch execution history
  const fetchExecutionHistory = useCallback(async (recurringTransactionId?: string) => {
    if (!currentFamily) return;

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('recurring_transaction_executions')
        .select(`
          *,
          transaction:transactions(id, description, amount, type),
          recurring_transaction:recurring_transactions!inner(family_id)
        `)
        .eq('recurring_transaction.family_id', currentFamily.id)
        .order('scheduled_date', { ascending: false });

      if (recurringTransactionId) {
        query = query.eq('recurring_transaction_id', recurringTransactionId);
      }

      const { data, error } = await query;

      if (error) {
        await logError('Failed to fetch execution history', {
          error: error.message,
          recurring_transaction_id: recurringTransactionId
        }, 'finance', 'fetch_execution_history', 'DATABASE_ERROR');
        throw error;
      }

      setExecutions(data || []);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch execution history';
      setError(errorMsg);
      await logError('Unexpected error fetching execution history', {
        error: errorMsg
      }, 'finance', 'fetch_execution_history', 'UNEXPECTED_ERROR');
    } finally {
      setLoading(false);
    }
  }, [currentFamily, logError]);

  // Process recurring transactions (manually trigger)
  const processRecurringTransactions = useCallback(async (): Promise<ProcessRecurringTransactionsResult | null> => {
    setLoading(true);
    setError(null);

    try {
      await logInfo('Processing recurring transactions manually', {
        family_id: currentFamily?.id
      }, 'finance', 'process_recurring_transactions');

      // Try to call the simplified processing function
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('process_recurring_transactions_simple');
        
        if (!rpcError && rpcData) {
          await logInfo('Recurring transactions processing result', rpcData, 'finance', 'process_recurring_transactions');
          return rpcData;
        }
      } catch (rpcErr) {
        // Fall back to placeholder if RPC fails
        console.warn('RPC processing failed, using fallback:', rpcErr);
      }

      // Fallback result
      await logInfo('Manual processing simulated - would trigger background service', {
        family_id: currentFamily?.id
      }, 'finance', 'process_recurring_transactions');

      const result = {
        processed_count: 0,
        failed_count: 0,
        error_messages: ['Manual processing not yet implemented - use automatic processing via Edge Functions']
      };

      // Refresh data after processing attempt
      await fetchRecurringTransactions(undefined, true); // Force refresh after processing
      await fetchUpcomingTransactions();

      return result;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to process recurring transactions';
      setError(errorMsg);
      await logError('Unexpected error processing recurring transactions', {
        error: errorMsg
      }, 'finance', 'process_recurring_transactions', 'UNEXPECTED_ERROR');
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentFamily, logInfo, logError, fetchRecurringTransactions, fetchUpcomingTransactions]);

  // Get recurring transaction by ID
  const getRecurringTransaction = useCallback((id: string): RecurringTransaction | undefined => {
    return recurringTransactions.find(rt => rt.id === id);
  }, [recurringTransactions]);

  // Get next execution date
  const getNextExecutionDate = useCallback((recurringTransaction: RecurringTransaction): Date => {
    return new Date(recurringTransaction.next_execution_date);
  }, []);

  // Load initial data when family changes
  useEffect(() => {
    if (currentFamily) {
      fetchRecurringTransactions(undefined, true); // Force refresh on family change
      fetchUpcomingTransactions();
    }
  }, [currentFamily]); // Remove function dependencies to avoid infinite loops

  return {
    recurringTransactions,
    upcomingTransactions,
    executions,
    loading,
    error,
    
    createRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    toggleRecurringTransaction,
    
    fetchRecurringTransactions,
    fetchUpcomingTransactions,
    fetchExecutionHistory,
    
    processRecurringTransactions,
    
    getRecurringTransaction,
    getNextExecutionDate
  };
};

export default useRecurringTransactions;