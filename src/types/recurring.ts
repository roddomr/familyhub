/**
 * Types for recurring transactions system
 */

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export type ExecutionStatus = 'pending' | 'completed' | 'failed' | 'skipped' | 'cancelled';

export interface RecurringTransaction {
  id: string;
  family_id: string;
  account_id: string;
  category_id?: string;
  created_by: string;
  
  // Template details
  description: string;
  amount: number;
  type: 'income' | 'expense';
  notes?: string;
  
  // Recurrence configuration
  frequency: RecurrenceFrequency;
  interval_count: number; // Every N periods
  start_date: string; // ISO date string
  end_date?: string; // Optional end date
  max_occurrences?: number; // Optional max occurrences
  
  // Weekly specific
  days_of_week?: number[]; // 0=Sunday, 1=Monday, etc.
  
  // Monthly specific
  day_of_month?: number; // Specific day of month (1-31)
  week_of_month?: number; // 1st, 2nd, 3rd, 4th, or 5th week
  day_of_week?: number; // Used with week_of_month
  
  // Status and metadata
  is_active: boolean;
  next_execution_date: string; // ISO date string
  last_execution_date?: string;
  execution_count: number;
  failed_execution_count: number;
  
  created_at: string;
  updated_at: string;
  
  // Joined data (when fetched with relations)
  account?: {
    name: string;
    type: string;
    balance: number;
  };
  category?: {
    name: string;
    color: string;
    icon: string;
  };
}

export interface RecurringTransactionExecution {
  id: string;
  recurring_transaction_id: string;
  transaction_id?: string;
  
  scheduled_date: string; // ISO date string
  executed_date?: string;
  execution_status: ExecutionStatus;
  
  error_message?: string;
  retry_count: number;
  next_retry_date?: string;
  
  created_at: string;
  updated_at: string;
  
  // Joined data
  transaction?: {
    id: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
  };
}

export interface CreateRecurringTransactionData {
  account_id: string;
  category_id?: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  notes?: string;
  
  frequency: RecurrenceFrequency;
  interval_count: number;
  start_date: string;
  end_date?: string;
  max_occurrences?: number;
  
  // Weekly pattern
  days_of_week?: number[];
  
  // Monthly pattern
  day_of_month?: number;
  week_of_month?: number;
  day_of_week?: number;
}

export interface UpdateRecurringTransactionData extends Partial<CreateRecurringTransactionData> {
  is_active?: boolean;
}

export interface RecurringTransactionFilters {
  account_id?: string;
  category_id?: string;
  type?: 'income' | 'expense';
  frequency?: RecurrenceFrequency;
  is_active?: boolean;
}

export interface UpcomingRecurringTransaction {
  recurring_transaction_id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  frequency: RecurrenceFrequency;
  next_date: string;
  account_name: string;
  category_name?: string;
}

export interface ProcessRecurringTransactionsResult {
  processed_count: number;
  failed_count: number;
  error_messages: string[];
}

// UI-specific types
export interface RecurrencePattern {
  frequency: RecurrenceFrequency;
  interval_count: number;
  
  // For display purposes
  label: string;
  description: string;
}

export const FREQUENCY_OPTIONS: RecurrencePattern[] = [
  {
    frequency: 'daily',
    interval_count: 1,
    label: 'Daily',
    description: 'Every day'
  },
  {
    frequency: 'weekly',
    interval_count: 1,
    label: 'Weekly',
    description: 'Every week'
  },
  {
    frequency: 'monthly',
    interval_count: 1,
    label: 'Monthly',
    description: 'Every month'
  },
  {
    frequency: 'quarterly',
    interval_count: 1,
    label: 'Quarterly',
    description: 'Every 3 months'
  },
  {
    frequency: 'yearly',
    interval_count: 1,
    label: 'Yearly',
    description: 'Every year'
  }
];

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' }
];

export const WEEKS_OF_MONTH = [
  { value: 1, label: '1st week' },
  { value: 2, label: '2nd week' },
  { value: 3, label: '3rd week' },
  { value: 4, label: '4th week' },
  { value: 5, label: 'Last week' }
];