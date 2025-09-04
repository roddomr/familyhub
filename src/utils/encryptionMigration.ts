/**
 * Encryption Migration Utility
 * Tool to encrypt existing unencrypted financial data in bulk
 */

import { supabase } from '@/lib/supabase';
import { 
  encryptFinancialAmount,
  encryptBankAccountData,
  encryptUserPII,
  generateFamilyKey,
  type BankAccountCredentials,
  type UserPIIData
} from '@/lib/security/encryption';

interface MigrationResult {
  success: boolean;
  processed: number;
  encrypted: number;
  failed: number;
  errors: string[];
  startTime: Date;
  endTime: Date;
  durationMs: number;
}

interface MigrationProgress {
  stage: string;
  current: number;
  total: number;
  percentage: number;
  currentItem?: string;
}

type ProgressCallback = (progress: MigrationProgress) => void;

export class EncryptionMigrator {
  private progressCallback?: ProgressCallback;

  constructor(progressCallback?: ProgressCallback) {
    this.progressCallback = progressCallback;
  }

  private reportProgress(stage: string, current: number, total: number, currentItem?: string) {
    if (this.progressCallback) {
      this.progressCallback({
        stage,
        current,
        total,
        percentage: total > 0 ? Math.round((current / total) * 100) : 0,
        currentItem
      });
    }
  }

  /**
   * Migrate all financial accounts balances to encrypted format
   */
  async migrateAccountBalances(familyId: string, familyKey: string): Promise<MigrationResult> {
    const startTime = new Date();
    const result: MigrationResult = {
      success: false,
      processed: 0,
      encrypted: 0,
      failed: 0,
      errors: [],
      startTime,
      endTime: new Date(),
      durationMs: 0
    };

    try {
      // Get all unencrypted financial accounts for this family
      const { data: accounts, error } = await supabase
        .from('financial_accounts')
        .select('id, name, balance')
        .eq('family_id', familyId)
        .is('balance_encrypted', null);

      if (error) throw error;

      const totalAccounts = accounts?.length || 0;
      this.reportProgress('Encrypting account balances', 0, totalAccounts);

      if (totalAccounts === 0) {
        result.success = true;
        result.endTime = new Date();
        result.durationMs = result.endTime.getTime() - startTime.getTime();
        return result;
      }

      for (let i = 0; i < totalAccounts; i++) {
        const account = accounts![i];
        result.processed++;
        
        this.reportProgress(
          'Encrypting account balances',
          i + 1,
          totalAccounts,
          `Account: ${account.name}`
        );

        try {
          const encryptedBalance = encryptFinancialAmount(account.balance, 'USD', familyKey);

          const { error: updateError } = await supabase
            .from('financial_accounts')
            .update({
              balance_encrypted: encryptedBalance,
              balance_encrypted_at: new Date().toISOString(),
              encryption_version: 1
            })
            .eq('id', account.id);

          if (updateError) throw updateError;

          result.encrypted++;

          // Log successful encryption
          await this.logEncryptionOperation(
            familyId,
            'financial_accounts',
            account.id,
            'ENCRYPT',
            true
          );

        } catch (err: any) {
          result.failed++;
          const errorMsg = `Account ${account.name} (${account.id}): ${err.message}`;
          result.errors.push(errorMsg);
          
          // Log failed encryption
          await this.logEncryptionOperation(
            familyId,
            'financial_accounts',
            account.id,
            'ENCRYPT',
            false,
            err.message
          );
        }

        // Small delay to prevent overwhelming the database
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      result.success = result.failed === 0;

    } catch (err: any) {
      result.errors.push(`Migration failed: ${err.message}`);
    }

    result.endTime = new Date();
    result.durationMs = result.endTime.getTime() - startTime.getTime();

    return result;
  }

  /**
   * Migrate all transaction amounts to encrypted format
   */
  async migrateTransactionAmounts(familyId: string, familyKey: string): Promise<MigrationResult> {
    const startTime = new Date();
    const result: MigrationResult = {
      success: false,
      processed: 0,
      encrypted: 0,
      failed: 0,
      errors: [],
      startTime,
      endTime: new Date(),
      durationMs: 0
    };

    try {
      // Get count of unencrypted transactions
      const { count } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('family_id', familyId)
        .is('amount_encrypted', null);

      const totalTransactions = count || 0;
      this.reportProgress('Encrypting transaction amounts', 0, totalTransactions);

      if (totalTransactions === 0) {
        result.success = true;
        result.endTime = new Date();
        result.durationMs = result.endTime.getTime() - startTime.getTime();
        return result;
      }

      // Process transactions in batches to avoid memory issues
      const batchSize = 50;
      let offset = 0;

      while (offset < totalTransactions) {
        const { data: transactions, error } = await supabase
          .from('transactions')
          .select('id, amount, description')
          .eq('family_id', familyId)
          .is('amount_encrypted', null)
          .range(offset, offset + batchSize - 1);

        if (error) throw error;

        if (!transactions || transactions.length === 0) break;

        for (const transaction of transactions) {
          result.processed++;
          
          this.reportProgress(
            'Encrypting transaction amounts',
            result.processed,
            totalTransactions,
            `Transaction: ${transaction.description?.substring(0, 30) || 'Unnamed'}...`
          );

          try {
            const encryptedAmount = encryptFinancialAmount(transaction.amount, 'USD', familyKey);

            const { error: updateError } = await supabase
              .from('transactions')
              .update({
                amount_encrypted: encryptedAmount,
                amount_encrypted_at: new Date().toISOString(),
                encryption_version: 1
              })
              .eq('id', transaction.id);

            if (updateError) throw updateError;

            result.encrypted++;

            // Log successful encryption
            await this.logEncryptionOperation(
              familyId,
              'transactions',
              transaction.id,
              'ENCRYPT',
              true
            );

          } catch (err: any) {
            result.failed++;
            const errorMsg = `Transaction ${transaction.id}: ${err.message}`;
            result.errors.push(errorMsg);
            
            // Log failed encryption
            await this.logEncryptionOperation(
              familyId,
              'transactions',
              transaction.id,
              'ENCRYPT',
              false,
              err.message
            );
          }
        }

        offset += batchSize;
        
        // Delay between batches
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      result.success = result.failed === 0;

    } catch (err: any) {
      result.errors.push(`Transaction migration failed: ${err.message}`);
    }

    result.endTime = new Date();
    result.durationMs = result.endTime.getTime() - startTime.getTime();

    return result;
  }

  /**
   * Migrate user PII data to encrypted format
   */
  async migrateUserPII(familyId: string, familyKey: string): Promise<MigrationResult> {
    const startTime = new Date();
    const result: MigrationResult = {
      success: false,
      processed: 0,
      encrypted: 0,
      failed: 0,
      errors: [],
      startTime,
      endTime: new Date(),
      durationMs: 0
    };

    try {
      // Get family members with unencrypted PII
      const { data: members, error } = await supabase
        .from('family_members')
        .select(`
          user_id,
          profiles!inner(
            id,
            first_name,
            last_name,
            date_of_birth,
            phone
          )
        `)
        .eq('family_id', familyId);

      if (error) throw error;

      const totalMembers = members?.length || 0;
      this.reportProgress('Encrypting user PII', 0, totalMembers);

      if (totalMembers === 0) {
        result.success = true;
        result.endTime = new Date();
        result.durationMs = result.endTime.getTime() - startTime.getTime();
        return result;
      }

      for (let i = 0; i < totalMembers; i++) {
        const member = members![i];
        const profile = member.profiles as any;
        result.processed++;
        
        this.reportProgress(
          'Encrypting user PII',
          i + 1,
          totalMembers,
          `User: ${profile.first_name} ${profile.last_name}`
        );

        try {
          // Create PII data object
          const piiData: UserPIIData = {
            fullName: `${profile.first_name} ${profile.last_name}`.trim(),
            dateOfBirth: profile.date_of_birth,
            phoneNumber: profile.phone
          };

          // Only encrypt if there's actual PII data
          if (piiData.fullName || piiData.dateOfBirth || piiData.phoneNumber) {
            const encryptedPII = encryptUserPII(piiData, familyKey);

            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                pii_encrypted: encryptedPII,
                pii_encrypted_at: new Date().toISOString(),
                encryption_version: 1
              })
              .eq('id', profile.id);

            if (updateError) throw updateError;

            result.encrypted++;

            // Log successful encryption
            await this.logEncryptionOperation(
              familyId,
              'profiles',
              profile.id,
              'ENCRYPT',
              true
            );
          }

        } catch (err: any) {
          result.failed++;
          const errorMsg = `User ${profile.first_name} ${profile.last_name} (${profile.id}): ${err.message}`;
          result.errors.push(errorMsg);
          
          // Log failed encryption
          await this.logEncryptionOperation(
            familyId,
            'profiles',
            profile.id,
            'ENCRYPT',
            false,
            err.message
          );
        }
      }

      result.success = result.failed === 0;

    } catch (err: any) {
      result.errors.push(`PII migration failed: ${err.message}`);
    }

    result.endTime = new Date();
    result.durationMs = result.endTime.getTime() - startTime.getTime();

    return result;
  }

  /**
   * Complete migration for a family
   */
  async migrateFamilyData(familyId: string): Promise<{
    success: boolean;
    results: {
      accounts: MigrationResult;
      transactions: MigrationResult;
      pii: MigrationResult;
    };
    summary: {
      totalProcessed: number;
      totalEncrypted: number;
      totalFailed: number;
      totalErrors: string[];
      durationMs: number;
    };
  }> {
    const startTime = new Date();

    // Get user salt to generate family key
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('User not authenticated');
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('encryption_salt')
      .eq('id', user.user.id)
      .single();

    if (profileError || !profile?.encryption_salt) {
      throw new Error('User encryption salt not found');
    }

    const familyKey = generateFamilyKey(familyId, profile.encryption_salt);

    // Run migrations in sequence
    this.reportProgress('Starting migration', 0, 3, 'Preparing...');

    const accountsResult = await this.migrateAccountBalances(familyId, familyKey);
    const transactionsResult = await this.migrateTransactionAmounts(familyId, familyKey);
    const piiResult = await this.migrateUserPII(familyId, familyKey);

    const endTime = new Date();

    return {
      success: accountsResult.success && transactionsResult.success && piiResult.success,
      results: {
        accounts: accountsResult,
        transactions: transactionsResult,
        pii: piiResult
      },
      summary: {
        totalProcessed: accountsResult.processed + transactionsResult.processed + piiResult.processed,
        totalEncrypted: accountsResult.encrypted + transactionsResult.encrypted + piiResult.encrypted,
        totalFailed: accountsResult.failed + transactionsResult.failed + piiResult.failed,
        totalErrors: [...accountsResult.errors, ...transactionsResult.errors, ...piiResult.errors],
        durationMs: endTime.getTime() - startTime.getTime()
      }
    };
  }

  /**
   * Log encryption operation
   */
  private async logEncryptionOperation(
    familyId: string,
    tableName: string,
    recordId: string,
    operation: string,
    success: boolean,
    errorMessage?: string
  ) {
    try {
      await supabase.rpc('log_encryption_operation', {
        p_family_id: familyId,
        p_user_id: (await supabase.auth.getUser()).data.user?.id,
        p_table_name: tableName,
        p_record_id: recordId,
        p_operation: operation,
        p_encryption_version: 1,
        p_success: success,
        p_error_message: errorMessage || null
      });
    } catch (err) {
      console.warn('Failed to log encryption operation:', err);
    }
  }
}

/**
 * Convenience function to migrate all data for current family
 */
export const migrateCurrentFamilyData = async (
  progressCallback?: ProgressCallback
): Promise<any> => {
  const migrator = new EncryptionMigrator(progressCallback);
  
  // Get current family from context
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    throw new Error('User not authenticated');
  }

  const { data: familyMember, error } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('user_id', user.user.id)
    .single();

  if (error || !familyMember) {
    throw new Error('User family not found');
  }

  return await migrator.migrateFamilyData(familyMember.family_id);
};

export default EncryptionMigrator;