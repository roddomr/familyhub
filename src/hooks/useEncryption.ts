/**
 * React hook for managing encrypted financial data
 * Provides secure encryption/decryption with family-specific keys
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/hooks/useFamily';
import { supabase } from '@/lib/supabase';
import { 
  encryptFinancialAmount,
  decryptFinancialAmount,
  encryptBankAccountData,
  decryptBankAccountData,
  encryptUserPII,
  generateFamilyKey,
  generateSalt,
  safeEncrypt,
  type EncryptedFinancialData,
  type DecryptedFinancialData,
  type BankAccountCredentials,
  type EncryptedBankAccount,
  type DecryptedBankAccount,
  type UserPIIData,
  type EncryptedUserPII
} from '@/lib/security/encryption';

interface EncryptionStatus {
  isEncrypted: boolean;
  encryptionVersion: number;
  encryptedAt?: string;
  lastError?: string;
}

interface EncryptionHealth {
  tableName: string;
  totalRecords: number;
  encryptedRecords: number;
  encryptionPercentage: number;
  latestEncryption?: string;
  healthStatus: 'FULLY_ENCRYPTED' | 'MOSTLY_ENCRYPTED' | 'PARTIALLY_ENCRYPTED' | 'MINIMALLY_ENCRYPTED' | 'NOT_ENCRYPTED';
}

export const useEncryption = () => {
  const { user } = useAuth();
  const { currentFamily } = useFamily();
  const [familyKey, setFamilyKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate or retrieve family encryption key
  const initializeFamilyKey = useCallback(async () => {
    if (!user || !currentFamily) return null;

    try {
      // Get user's encryption salt from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('encryption_salt')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.warn('Could not retrieve encryption salt:', profileError);
        return null;
      }

      if (!profile?.encryption_salt) {
        console.warn('User does not have encryption salt');
        return null;
      }

      // Generate family-specific key
      const key = generateFamilyKey(currentFamily.id, profile.encryption_salt);
      setFamilyKey(key);
      return key;
    } catch (err) {
      console.error('Failed to initialize family key:', err);
      setError('Failed to initialize encryption');
      return null;
    }
  }, [user, currentFamily]);

  // Initialize family key on mount
  useEffect(() => {
    initializeFamilyKey();
  }, [initializeFamilyKey]);

  /**
   * Encrypt financial amount (for transactions and balances)
   */
  const encryptAmount = useCallback(async (
    amount: number,
    currency: string = 'USD'
  ): Promise<EncryptedFinancialData | null> => {
    const key = familyKey || await initializeFamilyKey();
    if (!key) return null;

    return safeEncrypt(() => encryptFinancialAmount(amount, currency, key));
  }, [familyKey, initializeFamilyKey]);

  /**
   * Decrypt financial amount
   */
  const decryptAmount = useCallback(async (
    encryptedData: EncryptedFinancialData
  ): Promise<DecryptedFinancialData | null> => {
    const key = familyKey || await initializeFamilyKey();
    if (!key) return null;

    return safeEncrypt(() => decryptFinancialAmount(encryptedData, key));
  }, [familyKey, initializeFamilyKey]);

  /**
   * Encrypt bank account credentials
   */
  const encryptBankAccount = useCallback(async (
    accountData: BankAccountCredentials
  ): Promise<EncryptedBankAccount | null> => {
    const key = familyKey || await initializeFamilyKey();
    if (!key) return null;

    return safeEncrypt(() => encryptBankAccountData(accountData, key));
  }, [familyKey, initializeFamilyKey]);

  /**
   * Decrypt bank account credentials
   */
  const decryptBankAccount = useCallback(async (
    encryptedData: EncryptedBankAccount
  ): Promise<DecryptedBankAccount | null> => {
    const key = familyKey || await initializeFamilyKey();
    if (!key) return null;

    return safeEncrypt(() => decryptBankAccountData(encryptedData, key));
  }, [familyKey, initializeFamilyKey]);

  /**
   * Encrypt user PII data
   */
  const encryptPII = useCallback(async (
    piiData: UserPIIData
  ): Promise<EncryptedUserPII | null> => {
    const key = familyKey || await initializeFamilyKey();
    if (!key) return null;

    return safeEncrypt(() => encryptUserPII(piiData, key));
  }, [familyKey, initializeFamilyKey]);

  /**
   * Encrypt and store financial account balance
   */
  const encryptAccountBalance = useCallback(async (
    accountId: string,
    balance: number,
    currency: string = 'USD'
  ): Promise<boolean> => {
    if (!currentFamily || !user) return false;

    setLoading(true);
    setError(null);

    try {
      const encryptedBalance = await encryptAmount(balance, currency);
      if (!encryptedBalance) {
        throw new Error('Failed to encrypt balance');
      }

      const { error: updateError } = await supabase
        .from('financial_accounts')
        .update({
          balance_encrypted: encryptedBalance,
          balance_encrypted_at: new Date().toISOString(),
          encryption_version: 1
        })
        .eq('id', accountId)
        .eq('family_id', currentFamily.id);

      if (updateError) throw updateError;

      // Log encryption operation
      await logEncryptionOperation(
        currentFamily.id,
        user.id,
        'financial_accounts',
        accountId,
        'ENCRYPT',
        1,
        true
      );

      return true;
    } catch (err: any) {
      console.error('Failed to encrypt account balance:', err);
      setError(err.message);
      
      // Log failed operation
      if (currentFamily && user) {
        await logEncryptionOperation(
          currentFamily.id,
          user.id,
          'financial_accounts',
          accountId,
          'ENCRYPT',
          1,
          false,
          err.message
        );
      }
      
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentFamily, user, encryptAmount]);

  /**
   * Encrypt and store transaction amount
   */
  const encryptTransactionAmount = useCallback(async (
    transactionId: string,
    amount: number,
    currency: string = 'USD'
  ): Promise<boolean> => {
    if (!currentFamily || !user) return false;

    setLoading(true);
    setError(null);

    try {
      const encryptedAmount = await encryptAmount(amount, currency);
      if (!encryptedAmount) {
        throw new Error('Failed to encrypt transaction amount');
      }

      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          amount_encrypted: encryptedAmount,
          amount_encrypted_at: new Date().toISOString(),
          encryption_version: 1
        })
        .eq('id', transactionId)
        .eq('family_id', currentFamily.id);

      if (updateError) throw updateError;

      // Log encryption operation
      await logEncryptionOperation(
        currentFamily.id,
        user.id,
        'transactions',
        transactionId,
        'ENCRYPT',
        1,
        true
      );

      return true;
    } catch (err: any) {
      console.error('Failed to encrypt transaction amount:', err);
      setError(err.message);
      
      // Log failed operation
      if (currentFamily && user) {
        await logEncryptionOperation(
          currentFamily.id,
          user.id,
          'transactions',
          transactionId,
          'ENCRYPT',
          1,
          false,
          err.message
        );
      }
      
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentFamily, user, encryptAmount]);

  /**
   * Get encryption status for an account
   */
  const getAccountEncryptionStatus = useCallback(async (
    accountId: string
  ): Promise<EncryptionStatus | null> => {
    if (!currentFamily) return null;

    try {
      const { data, error } = await supabase
        .from('financial_accounts')
        .select('balance_encrypted, balance_encrypted_at, encryption_version')
        .eq('id', accountId)
        .eq('family_id', currentFamily.id)
        .single();

      if (error) throw error;

      return {
        isEncrypted: !!data.balance_encrypted,
        encryptionVersion: data.encryption_version || 1,
        encryptedAt: data.balance_encrypted_at
      };
    } catch (err: any) {
      console.error('Failed to get encryption status:', err);
      return null;
    }
  }, [currentFamily]);

  /**
   * Get family encryption health report
   */
  const getEncryptionHealth = useCallback(async (): Promise<EncryptionHealth[]> => {
    if (!currentFamily) return [];

    try {
      const { data, error } = await supabase
        .rpc('check_encryption_health', { p_family_id: currentFamily.id });

      if (error) throw error;

      return data.map((row: any) => ({
        tableName: row.table_name,
        totalRecords: parseInt(row.total_records),
        encryptedRecords: parseInt(row.encrypted_records),
        encryptionPercentage: parseFloat(row.encryption_percentage),
        latestEncryption: row.latest_encryption,
        healthStatus: row.health_status
      }));
    } catch (err) {
      console.error('Failed to get encryption health:', err);
      return [];
    }
  }, [currentFamily]);

  /**
   * Bulk encrypt existing financial data
   */
  const bulkEncryptFinancialData = useCallback(async (): Promise<{
    success: boolean;
    encrypted: number;
    failed: number;
    errors: string[];
  }> => {
    if (!currentFamily || !user) {
      return { success: false, encrypted: 0, failed: 0, errors: ['No family or user context'] };
    }

    setLoading(true);
    setError(null);

    const result = { success: true, encrypted: 0, failed: 0, errors: [] as string[] };

    try {
      // Encrypt financial account balances
      const { data: accounts, error: accountsError } = await supabase
        .from('financial_accounts')
        .select('id, balance')
        .eq('family_id', currentFamily.id)
        .is('balance_encrypted', null);

      if (accountsError) throw accountsError;

      for (const account of accounts || []) {
        try {
          const success = await encryptAccountBalance(account.id, account.balance);
          if (success) {
            result.encrypted++;
          } else {
            result.failed++;
            result.errors.push(`Failed to encrypt balance for account ${account.id}`);
          }
        } catch (err: any) {
          result.failed++;
          result.errors.push(`Account ${account.id}: ${err.message}`);
        }
      }

      // Encrypt transaction amounts
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('id, amount')
        .eq('family_id', currentFamily.id)
        .is('amount_encrypted', null)
        .limit(100); // Process in batches

      if (transactionsError) throw transactionsError;

      for (const transaction of transactions || []) {
        try {
          const success = await encryptTransactionAmount(transaction.id, transaction.amount);
          if (success) {
            result.encrypted++;
          } else {
            result.failed++;
            result.errors.push(`Failed to encrypt amount for transaction ${transaction.id}`);
          }
        } catch (err: any) {
          result.failed++;
          result.errors.push(`Transaction ${transaction.id}: ${err.message}`);
        }
      }

      result.success = result.failed === 0;
      
    } catch (err: any) {
      result.success = false;
      result.errors.push(`Bulk encryption failed: ${err.message}`);
      setError(err.message);
    } finally {
      setLoading(false);
    }

    return result;
  }, [currentFamily, user, encryptAccountBalance, encryptTransactionAmount]);

  // Helper function to log encryption operations
  const logEncryptionOperation = async (
    familyId: string,
    userId: string,
    tableName: string,
    recordId: string,
    operation: string,
    version: number,
    success: boolean,
    errorMessage?: string
  ) => {
    try {
      await supabase.rpc('log_encryption_operation', {
        p_family_id: familyId,
        p_user_id: userId,
        p_table_name: tableName,
        p_record_id: recordId,
        p_operation: operation,
        p_encryption_version: version,
        p_success: success,
        p_error_message: errorMessage || null
      });
    } catch (err) {
      console.warn('Failed to log encryption operation:', err);
    }
  };

  return {
    // Core encryption functions
    encryptAmount,
    decryptAmount,
    encryptBankAccount,
    decryptBankAccount,
    encryptPII,
    
    // Database operations
    encryptAccountBalance,
    encryptTransactionAmount,
    
    // Status and health
    getAccountEncryptionStatus,
    getEncryptionHealth,
    bulkEncryptFinancialData,
    
    // State
    loading,
    error,
    isReady: !!familyKey
  };
};

export default useEncryption;