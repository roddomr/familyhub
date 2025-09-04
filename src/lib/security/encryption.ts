/**
 * Advanced encryption utilities for sensitive financial data
 * Handles encryption/decryption of amounts, balances, account data, and other sensitive information
 * Uses AES-256-GCM with PBKDF2 key derivation for maximum security
 */

import crypto from 'crypto';

// Enhanced security configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits for GCM
const TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits for PBKDF2
const PBKDF2_ITERATIONS = 100000; // OWASP recommended minimum

/**
 * Environment-based encryption key management
 * In production, this should come from a secure key management service
 */
const getEncryptionKey = (): Buffer => {
  const keyString = process.env.VITE_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  
  if (!keyString) {
    throw new Error('Encryption key not found in environment variables');
  }
  
  // Ensure key is exactly 32 bytes
  const key = Buffer.from(keyString, 'hex');
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Encryption key must be exactly ${KEY_LENGTH} bytes (64 hex characters)`);
  }
  
  return key;
};

/**
 * Generate a cryptographically secure random key
 * Use this once to generate your ENCRYPTION_KEY environment variable
 */
export const generateEncryptionKey = (): string => {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
};

/**
 * Encrypt sensitive data (amounts, balances, etc.)
 */
export const encryptSensitiveData = (data: string | number): string => {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipher(ENCRYPTION_ALGORITHM, key);
    
    // Convert number to string if needed
    const plaintext = typeof data === 'number' ? data.toString() : data;
    
    cipher.setAAD(Buffer.from('financial_data')); // Additional authenticated data
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combine IV + tag + encrypted data
    return iv.toString('hex') + tag.toString('hex') + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt sensitive data');
  }
};

/**
 * Decrypt sensitive data
 */
export const decryptSensitiveData = (encryptedData: string): string => {
  try {
    const key = getEncryptionKey();
    
    // Extract IV, tag, and encrypted data
    const iv = Buffer.from(encryptedData.slice(0, IV_LENGTH * 2), 'hex');
    const tag = Buffer.from(encryptedData.slice(IV_LENGTH * 2, (IV_LENGTH + TAG_LENGTH) * 2), 'hex');
    const encrypted = encryptedData.slice((IV_LENGTH + TAG_LENGTH) * 2);
    
    const decipher = crypto.createDecipher(ENCRYPTION_ALGORITHM, key);
    decipher.setAuthTag(tag);
    decipher.setAAD(Buffer.from('financial_data'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt sensitive data');
  }
};

/**
 * Encrypt financial amount with validation
 */
export const encryptAmount = (amount: number): string => {
  if (!isValidAmount(amount)) {
    throw new Error('Invalid amount for encryption');
  }
  
  return encryptSensitiveData(amount.toFixed(2));
};

/**
 * Decrypt financial amount with validation
 */
export const decryptAmount = (encryptedAmount: string): number => {
  const decrypted = decryptSensitiveData(encryptedAmount);
  const amount = parseFloat(decrypted);
  
  if (!isValidAmount(amount)) {
    throw new Error('Decrypted amount is invalid');
  }
  
  return amount;
};

/**
 * Hash sensitive data for comparison/indexing (one-way)
 */
export const hashSensitiveData = (data: string): string => {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512');
  return salt.toString('hex') + ':' + hash.toString('hex');
};

/**
 * Verify hashed data
 */
export const verifySensitiveDataHash = (data: string, hash: string): boolean => {
  const [salt, originalHash] = hash.split(':');
  const testHash = crypto.pbkdf2Sync(data, Buffer.from(salt, 'hex'), 100000, 64, 'sha512');
  return originalHash === testHash.toString('hex');
};

/**
 * Generate secure random token for sessions
 */
export const generateSecureToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Create data integrity checksum
 */
export const createDataChecksum = (data: any): string => {
  const dataString = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash('sha256').update(dataString).digest('hex');
};

/**
 * Verify data integrity checksum
 */
export const verifyDataChecksum = (data: any, expectedChecksum: string): boolean => {
  const actualChecksum = createDataChecksum(data);
  return actualChecksum === expectedChecksum;
};

/**
 * Validation helpers
 */
export const isValidAmount = (amount: number): boolean => {
  return (
    typeof amount === 'number' &&
    !isNaN(amount) &&
    isFinite(amount) &&
    amount >= 0 &&
    amount <= 999999999.99 && // Max amount limit
    Math.round(amount * 100) === amount * 100 // Max 2 decimal places
  );
};

/**
 * Sanitize financial input
 */
export const sanitizeFinancialInput = (input: string | number): number => {
  if (typeof input === 'number') {
    return input;
  }
  
  // Remove non-numeric characters except decimal point
  const cleaned = input.replace(/[^\d.-]/g, '');
  const amount = parseFloat(cleaned);
  
  if (isNaN(amount)) {
    throw new Error('Invalid numeric input');
  }
  
  // Round to 2 decimal places
  return Math.round(amount * 100) / 100;
};

/**
 * Mask sensitive data for display (show only last 4 digits)
 */
export const maskSensitiveData = (data: string, visibleChars: number = 4): string => {
  if (data.length <= visibleChars) {
    return '*'.repeat(data.length);
  }
  
  const masked = '*'.repeat(data.length - visibleChars);
  return masked + data.slice(-visibleChars);
};

/**
 * Client-side encryption utilities (for browser environment)
 * Note: In a real implementation, you'd use Web Crypto API for client-side encryption
 */
export const ClientEncryption = {
  /**
   * Simple obfuscation for client-side temporary data (not cryptographically secure)
   * Use only for UI state, not for actual security
   */
  obfuscate: (data: string): string => {
    return Buffer.from(data, 'utf8').toString('base64');
  },
  
  deobfuscate: (obfuscatedData: string): string => {
    return Buffer.from(obfuscatedData, 'base64').toString('utf8');
  },
  
  /**
   * Generate client session ID
   */
  generateSessionId: (): string => {
    // Use crypto.getRandomValues if available (browser), fallback to Math.random
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const array = new Uint8Array(16);
      window.crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    } else {
      return generateSecureToken(16);
    }
  }
};

/**
 * Security constants and thresholds
 */
export const SECURITY_THRESHOLDS = {
  LARGE_TRANSACTION: 1000,
  CRITICAL_TRANSACTION: 10000,
  SUSPICIOUS_TRANSACTION_COUNT: 10, // Per hour
  MAX_TRANSACTION_AMOUNT: 999999.99,
  SESSION_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes
} as const;

/**
 * Advanced encryption functions for comprehensive data protection
 */

/**
 * Generate random salt for PBKDF2
 */
export const generateSalt = (): string => {
  return crypto.randomBytes(SALT_LENGTH).toString('hex');
};

/**
 * Derive encryption key using PBKDF2
 */
export const deriveKey = (password: string, salt: string): Buffer => {
  return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
};

/**
 * Advanced encryption for financial amounts with metadata
 */
export const encryptFinancialAmount = (
  amount: number,
  currency: string = 'USD',
  familyKey: string
): EncryptedFinancialData => {
  try {
    if (!isValidAmount(amount)) {
      throw new Error('Invalid amount for encryption');
    }

    // Create structured data with integrity check
    const financialData = {
      amount: amount.toFixed(2),
      currency,
      timestamp: new Date().toISOString(),
      checksum: createDataChecksum({ amount, currency })
    };

    const salt = generateSalt();
    const key = deriveKey(familyKey, salt);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipher(ENCRYPTION_ALGORITHM, key);
    cipher.setAAD(Buffer.from('financial_amount'));
    
    let encrypted = cipher.update(JSON.stringify(financialData), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      salt,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      currency, // Stored unencrypted for queries
      encrypted_at: new Date().toISOString(),
      data_type: 'financial_amount'
    };
  } catch (error) {
    console.error('Financial amount encryption failed:', error);
    throw new Error('Failed to encrypt financial amount');
  }
};

/**
 * Decrypt financial amount with integrity verification
 */
export const decryptFinancialAmount = (
  encryptedData: EncryptedFinancialData,
  familyKey: string
): DecryptedFinancialData => {
  try {
    const key = deriveKey(familyKey, encryptedData.salt);
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const tag = Buffer.from(encryptedData.tag, 'hex');
    
    const decipher = crypto.createDecipher(ENCRYPTION_ALGORITHM, key);
    decipher.setAuthTag(tag);
    decipher.setAAD(Buffer.from('financial_amount'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    const financialData = JSON.parse(decrypted);
    
    // Verify integrity
    const expectedChecksum = createDataChecksum({ 
      amount: parseFloat(financialData.amount), 
      currency: financialData.currency 
    });
    
    if (financialData.checksum !== expectedChecksum) {
      throw new Error('Financial data integrity check failed');
    }
    
    return {
      amount: parseFloat(financialData.amount),
      currency: financialData.currency,
      timestamp: financialData.timestamp,
      decrypted_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Financial amount decryption failed:', error);
    throw new Error('Failed to decrypt financial amount');
  }
};

/**
 * Encrypt bank account credentials securely
 */
export const encryptBankAccountData = (
  accountData: BankAccountCredentials,
  familyKey: string
): EncryptedBankAccount => {
  try {
    // Hash sensitive data that doesn't need to be retrievable
    const accountNumberHash = hashSensitiveData(accountData.accountNumber);
    const routingNumberHash = hashSensitiveData(accountData.routingNumber);
    
    // Encrypt retrievable data
    const encryptableData = {
      bankName: accountData.bankName,
      accountType: accountData.accountType,
      accountNickname: accountData.accountNickname || '',
      lastFourDigits: accountData.accountNumber.slice(-4),
      metadata: accountData.metadata || {}
    };
    
    const salt = generateSalt();
    const key = deriveKey(familyKey, salt);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipher(ENCRYPTION_ALGORITHM, key);
    cipher.setAAD(Buffer.from('bank_account'));
    
    let encrypted = cipher.update(JSON.stringify(encryptableData), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      salt,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      account_number_hash: accountNumberHash,
      routing_number_hash: routingNumberHash,
      last_four: accountData.accountNumber.slice(-4),
      bank_name: accountData.bankName, // Unencrypted for display
      account_type: accountData.accountType,
      encrypted_at: new Date().toISOString(),
      data_type: 'bank_account'
    };
  } catch (error) {
    console.error('Bank account encryption failed:', error);
    throw new Error('Failed to encrypt bank account data');
  }
};

/**
 * Decrypt bank account data
 */
export const decryptBankAccountData = (
  encryptedData: EncryptedBankAccount,
  familyKey: string
): DecryptedBankAccount => {
  try {
    const key = deriveKey(familyKey, encryptedData.salt);
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const tag = Buffer.from(encryptedData.tag, 'hex');
    
    const decipher = crypto.createDecipher(ENCRYPTION_ALGORITHM, key);
    decipher.setAuthTag(tag);
    decipher.setAAD(Buffer.from('bank_account'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    const accountData = JSON.parse(decrypted);
    
    return {
      bankName: accountData.bankName,
      accountType: accountData.accountType,
      accountNickname: accountData.accountNickname,
      lastFourDigits: accountData.lastFourDigits,
      metadata: accountData.metadata,
      decrypted_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Bank account decryption failed:', error);
    throw new Error('Failed to decrypt bank account data');
  }
};

/**
 * Generate family-specific encryption key
 */
export const generateFamilyKey = (familyId: string, userSalt: string): string => {
  try {
    const masterKey = getEncryptionKey().toString('hex');
    const combined = familyId + userSalt + masterKey;
    return crypto.createHash('sha256').update(combined).digest('hex');
  } catch (error) {
    console.error('Family key generation failed:', error);
    throw new Error('Failed to generate family encryption key');
  }
};

/**
 * Encrypt user sensitive information (PII)
 */
export const encryptUserPII = (
  piiData: UserPIIData,
  familyKey: string
): EncryptedUserPII => {
  try {
    const salt = generateSalt();
    const key = deriveKey(familyKey, salt);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipher(ENCRYPTION_ALGORITHM, key);
    cipher.setAAD(Buffer.from('user_pii'));
    
    let encrypted = cipher.update(JSON.stringify(piiData), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      salt,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      encrypted_at: new Date().toISOString(),
      data_type: 'user_pii'
    };
  } catch (error) {
    console.error('User PII encryption failed:', error);
    throw new Error('Failed to encrypt user PII');
  }
};

/**
 * Safe encryption wrapper with error handling
 */
export const safeEncrypt = <T>(
  operation: () => T,
  fallback?: T
): T | null => {
  try {
    return operation();
  } catch (error) {
    console.error('Safe encryption operation failed:', error);
    return fallback ?? null;
  }
};

// Type definitions for new encryption functions
export interface EncryptedFinancialData {
  encrypted: string;
  salt: string;
  iv: string;
  tag: string;
  currency: string;
  encrypted_at: string;
  data_type: 'financial_amount';
}

export interface DecryptedFinancialData {
  amount: number;
  currency: string;
  timestamp: string;
  decrypted_at: string;
}

export interface BankAccountCredentials {
  accountNumber: string;
  routingNumber: string;
  bankName: string;
  accountType: 'checking' | 'savings' | 'credit' | 'investment';
  accountNickname?: string;
  metadata?: Record<string, any>;
}

export interface EncryptedBankAccount {
  encrypted: string;
  salt: string;
  iv: string;
  tag: string;
  account_number_hash: string;
  routing_number_hash: string;
  last_four: string;
  bank_name: string;
  account_type: string;
  encrypted_at: string;
  data_type: 'bank_account';
}

export interface DecryptedBankAccount {
  bankName: string;
  accountType: string;
  accountNickname: string;
  lastFourDigits: string;
  metadata: Record<string, any>;
  decrypted_at: string;
}

export interface UserPIIData {
  fullName?: string;
  dateOfBirth?: string;
  ssn?: string;
  address?: string;
  phoneNumber?: string;
  emergencyContact?: string;
}

export interface EncryptedUserPII {
  encrypted: string;
  salt: string;
  iv: string;
  tag: string;
  encrypted_at: string;
  data_type: 'user_pii';
}

export default {
  encryptSensitiveData,
  decryptSensitiveData,
  encryptAmount,
  decryptAmount,
  encryptFinancialAmount,
  decryptFinancialAmount,
  encryptBankAccountData,
  decryptBankAccountData,
  encryptUserPII,
  hashSensitiveData,
  verifySensitiveDataHash,
  generateSecureToken,
  generateSalt,
  deriveKey,
  generateFamilyKey,
  createDataChecksum,
  verifyDataChecksum,
  isValidAmount,
  sanitizeFinancialInput,
  maskSensitiveData,
  safeEncrypt,
  ClientEncryption,
  SECURITY_THRESHOLDS,
};