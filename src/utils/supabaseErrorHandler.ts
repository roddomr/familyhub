/**
 * Supabase Error Handler with retry logic and better error messages
 */

export interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  backoff?: boolean;
}

export class SupabaseConnectionError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'SupabaseConnectionError';
  }
}

/**
 * Retry a Supabase operation with exponential backoff
 */
export async function retrySupabaseOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, delay = 1000, backoff = true } = options;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries;
      const isConnectionError = 
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('ERR_INSUFFICIENT_RESOURCES') ||
        error.message?.includes('NetworkError') ||
        error.code === 'NETWORK_ERROR';

      if (isLastAttempt || !isConnectionError) {
        if (isConnectionError) {
          throw new SupabaseConnectionError(
            'Unable to connect to the database. Please check your internet connection and try again.',
            error
          );
        }
        throw error;
      }

      // Wait before retrying with exponential backoff
      const waitTime = backoff ? delay * Math.pow(2, attempt - 1) : delay;
      console.log(`Supabase operation failed (attempt ${attempt}/${maxRetries}). Retrying in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw new Error('Max retries exceeded');
}

/**
 * Get user-friendly error message from Supabase error
 */
export function getSupabaseErrorMessage(error: any): string {
  if (error instanceof SupabaseConnectionError) {
    return error.message;
  }

  if (error.message?.includes('Failed to fetch')) {
    return 'Connection lost. Please check your internet connection and try again.';
  }

  if (error.message?.includes('ERR_INSUFFICIENT_RESOURCES')) {
    return 'Server is temporarily busy. Please wait a moment and try again.';
  }

  if (error.code === 'PGRST116') {
    return 'Access denied. Please make sure you have permission to perform this action.';
  }

  if (error.code === '42P01') {
    return 'Database table not found. Please contact support.';
  }

  if (error.code === '23505') {
    return 'This record already exists.';
  }

  if (error.code === '23503') {
    return 'Cannot delete this record because it is referenced by other data.';
  }

  // Default fallback
  return error.message || 'An unexpected error occurred. Please try again.';
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  const retryableMessages = [
    'Failed to fetch',
    'ERR_INSUFFICIENT_RESOURCES',
    'NetworkError',
    'timeout',
    'ECONNRESET',
    'ENOTFOUND'
  ];

  const retryableCodes = [
    'NETWORK_ERROR',
    'TIMEOUT',
    '08006', // Connection failure
    '08003', // Connection does not exist
    '57P01'  // Admin shutdown
  ];

  return retryableMessages.some(msg => error.message?.includes(msg)) ||
         retryableCodes.includes(error.code) ||
         (error.status >= 500 && error.status < 600); // Server errors
}