/**
 * Comprehensive input validation and sanitization for financial security
 */

import { z } from 'zod';

// Security constants
const MAX_STRING_LENGTH = 500;
const MAX_AMOUNT = 999999999.99;
const MIN_AMOUNT = 0;

/**
 * Financial amount validation schema
 */
export const AmountSchema = z.number()
  .min(MIN_AMOUNT, 'Amount must be positive')
  .max(MAX_AMOUNT, 'Amount exceeds maximum allowed')
  .refine((val) => {
    // Check for exactly 2 decimal places
    return Math.round(val * 100) === val * 100;
  }, 'Amount must have at most 2 decimal places')
  .refine((val) => {
    // Check for valid number
    return !isNaN(val) && isFinite(val);
  }, 'Amount must be a valid number');

/**
 * Transaction validation schema
 */
export const TransactionSchema = z.object({
  description: z.string()
    .min(1, 'Description is required')
    .max(255, 'Description too long')
    .refine((val) => {
      // Remove HTML tags and scripts
      const cleaned = val.replace(/<[^>]*>/g, '');
      return cleaned === val;
    }, 'Description contains invalid characters'),
  
  amount: AmountSchema,
  
  type: z.enum(['income', 'expense'], {
    errorMap: () => ({ message: 'Transaction type must be income or expense' })
  }),
  
  date: z.string()
    .refine((val) => {
      const date = new Date(val);
      return !isNaN(date.getTime()) && date <= new Date();
    }, 'Date must be valid and not in the future'),
  
  category_id: z.string()
    .uuid('Category ID must be a valid UUID')
    .optional()
    .nullable(),
  
  account_id: z.string()
    .uuid('Account ID must be a valid UUID'),
  
  notes: z.string()
    .max(1000, 'Notes too long')
    .optional()
    .nullable()
    .transform((val) => val ? sanitizeText(val) : val),
});

/**
 * Budget validation schema
 */
export const BudgetSchema = z.object({
  name: z.string()
    .min(1, 'Budget name is required')
    .max(100, 'Budget name too long')
    .refine((val) => {
      return /^[a-zA-Z0-9\s\-_\.]+$/.test(val);
    }, 'Budget name contains invalid characters'),
  
  amount: AmountSchema,
  
  period: z.enum(['weekly', 'bi-weekly', 'fortnightly', 'monthly', 'yearly'], {
    errorMap: () => ({ message: 'Invalid budget period' })
  }),
  
  category_id: z.string()
    .uuid('Category ID must be a valid UUID')
    .optional()
    .nullable(),
  
  alert_threshold: z.number()
    .min(0.1, 'Alert threshold must be at least 10%')
    .max(1, 'Alert threshold cannot exceed 100%')
    .default(0.8),
  
  start_date: z.string()
    .refine((val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    }, 'Start date must be valid'),
});

/**
 * Account validation schema
 */
export const AccountSchema = z.object({
  name: z.string()
    .min(1, 'Account name is required')
    .max(100, 'Account name too long')
    .refine((val) => {
      return /^[a-zA-Z0-9\s\-_\.]+$/.test(val);
    }, 'Account name contains invalid characters'),
  
  type: z.enum(['checking', 'savings', 'credit_card', 'cash', 'investment', 'other'], {
    errorMap: () => ({ message: 'Invalid account type' })
  }),
  
  balance: AmountSchema.default(0),
  
  currency: z.string()
    .length(3, 'Currency must be 3 characters')
    .regex(/^[A-Z]{3}$/, 'Currency must be uppercase letters')
    .default('USD'),
});

/**
 * Family validation schema
 */
export const FamilySchema = z.object({
  name: z.string()
    .min(1, 'Family name is required')
    .max(100, 'Family name too long')
    .refine((val) => {
      return /^[a-zA-Z0-9\s\-_\.]+$/.test(val);
    }, 'Family name contains invalid characters'),
  
  description: z.string()
    .max(500, 'Description too long')
    .optional()
    .nullable()
    .transform((val) => val ? sanitizeText(val) : val),
});

/**
 * Text sanitization function
 */
export const sanitizeText = (text: string): string => {
  return text
    .trim()
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/&lt;script/gi, '') // Remove encoded script tags
    .replace(/&gt;/g, '') // Remove encoded closing tags
    .slice(0, MAX_STRING_LENGTH); // Limit length
};

/**
 * Sanitize financial input
 */
export const sanitizeAmount = (input: string | number): number => {
  if (typeof input === 'number') {
    return Math.round(input * 100) / 100; // Round to 2 decimal places
  }
  
  // Remove all non-numeric characters except decimal point and minus sign
  const cleaned = input.replace(/[^\d.-]/g, '');
  
  // Handle multiple decimal points - keep only the first one
  const parts = cleaned.split('.');
  const sanitized = parts.length > 2 
    ? parts[0] + '.' + parts.slice(1).join('')
    : cleaned;
  
  const amount = parseFloat(sanitized);
  
  if (isNaN(amount)) {
    throw new Error('Invalid amount format');
  }
  
  return Math.round(amount * 100) / 100;
};

/**
 * Validate UUID format
 */
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Validate date format and range
 */
export const validateDateRange = (date: string, minDate?: Date, maxDate?: Date): boolean => {
  const targetDate = new Date(date);
  
  if (isNaN(targetDate.getTime())) {
    return false;
  }
  
  if (minDate && targetDate < minDate) {
    return false;
  }
  
  if (maxDate && targetDate > maxDate) {
    return false;
  }
  
  return true;
};

/**
 * SQL injection prevention
 */
export const preventSQLInjection = (input: string): string => {
  return input
    .replace(/'/g, "''") // Escape single quotes
    .replace(/;/g, '') // Remove semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove SQL block comments start
    .replace(/\*\//g, '') // Remove SQL block comments end
    .replace(/xp_/gi, '') // Remove SQL Server extended procedures
    .replace(/sp_/gi, '') // Remove SQL Server stored procedures
    .replace(/union/gi, '') // Remove UNION statements
    .replace(/select/gi, '') // Remove SELECT statements
    .replace(/insert/gi, '') // Remove INSERT statements
    .replace(/update/gi, '') // Remove UPDATE statements
    .replace(/delete/gi, '') // Remove DELETE statements
    .replace(/drop/gi, ''); // Remove DROP statements
};

/**
 * XSS prevention
 */
export const preventXSS = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/&/g, '&amp;');
};

/**
 * Rate limiting validation
 */
export const validateRateLimit = (
  operations: Array<{ timestamp: Date }>, 
  windowMs: number, 
  maxOperations: number
): boolean => {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);
  
  const recentOperations = operations.filter(op => op.timestamp >= windowStart);
  return recentOperations.length < maxOperations;
};

/**
 * Password strength validation
 */
export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
} => {
  const errors: string[] = [];
  let score = 0;
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else {
    score += 1;
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    score += 1;
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else {
    score += 1;
  }
  
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (score >= 4) strength = 'strong';
  else if (score >= 3) strength = 'medium';
  
  return {
    isValid: errors.length === 0,
    errors,
    strength
  };
};

/**
 * IP address validation
 */
export const validateIPAddress = (ip: string): boolean => {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

/**
 * User agent validation (basic)
 */
export const validateUserAgent = (userAgent: string): boolean => {
  return (
    typeof userAgent === 'string' &&
    userAgent.length > 0 &&
    userAgent.length < 1000 &&
    !/[<>]/.test(userAgent) // Basic XSS prevention
  );
};

/**
 * File upload validation
 */
export const validateFileUpload = (file: File, allowedTypes: string[], maxSize: number): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed`);
  }
  
  if (file.size > maxSize) {
    errors.push(`File size ${file.size} exceeds maximum ${maxSize} bytes`);
  }
  
  // Check for malicious file names
  const maliciousPatterns = [
    /\.\./,  // Directory traversal
    /[<>:"|?*]/,  // Invalid filename characters
    /\.exe$|\.bat$|\.cmd$|\.scr$/i  // Executable files
  ];
  
  for (const pattern of maliciousPatterns) {
    if (pattern.test(file.name)) {
      errors.push('File name contains invalid characters or patterns');
      break;
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Environment-specific validations
 */
export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

export const requireHTTPS = (): boolean => {
  return isProduction();
};

/**
 * Security headers validation
 */
export const validateSecurityHeaders = (headers: Record<string, string>): {
  isValid: boolean;
  missingHeaders: string[];
} => {
  const requiredHeaders = [
    'content-security-policy',
    'x-frame-options',
    'x-content-type-options',
    'strict-transport-security',
    'referrer-policy'
  ];
  
  const missingHeaders = requiredHeaders.filter(
    header => !headers[header] && !headers[header.toLowerCase()]
  );
  
  return {
    isValid: missingHeaders.length === 0,
    missingHeaders
  };
};

export default {
  AmountSchema,
  TransactionSchema,
  BudgetSchema,
  AccountSchema,
  FamilySchema,
  sanitizeText,
  sanitizeAmount,
  isValidUUID,
  validateDateRange,
  preventSQLInjection,
  preventXSS,
  validateRateLimit,
  validatePasswordStrength,
  validateIPAddress,
  validateUserAgent,
  validateFileUpload,
  isProduction,
  requireHTTPS,
  validateSecurityHeaders,
};