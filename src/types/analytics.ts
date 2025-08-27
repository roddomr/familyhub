// Analytics and reporting types for Family Hub

export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type DateRange = 'last_7_days' | 'last_30_days' | 'last_90_days' | 'last_year' | 'current_month' | 'current_year';
export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'area' | 'progress';
export type ReportType = 'income_expense' | 'budget_analysis' | 'category_breakdown' | 'trends' | 'custom';
export type ReportStatus = 'pending' | 'running' | 'completed' | 'failed';
export type ExportFormat = 'pdf' | 'csv' | 'xlsx' | 'json';

// Financial insights aggregated data
export interface FinancialInsight {
  id: string;
  family_id: string;
  period_type: PeriodType;
  period_start: string;
  period_end: string;
  total_income: number;
  total_expenses: number;
  net_income: number;
  transaction_count: number;
  income_by_category: Record<string, number>;
  expenses_by_category: Record<string, number>;
  account_balances: Record<string, number>;
  budget_performance: Record<string, BudgetPerformance>;
  income_trend: number;
  expense_trend: number;
  created_at: string;
  updated_at: string;
}

// Budget performance metrics
export interface BudgetPerformance {
  budgeted: number;
  spent: number;
  remaining: number;
  percentage_used: number;
  status: 'on_track' | 'warning' | 'over_budget';
  days_remaining: number;
}

// User activity tracking
export interface UserActivityMetrics {
  id: string;
  family_id: string;
  user_id: string;
  activity_date: string;
  transactions_created: number;
  accounts_created: number;
  budgets_created: number;
  login_count: number;
  time_spent_seconds: number;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

// Saved reports configuration
export interface SavedReport {
  id: string;
  family_id: string;
  created_by: string;
  name: string;
  description?: string;
  report_type: ReportType;
  config: ReportConfig;
  is_scheduled: boolean;
  schedule_frequency?: PeriodType;
  next_run_at?: string;
  auto_export: boolean;
  export_formats: ExportFormat[];
  created_at: string;
  updated_at: string;
}

// Report configuration structure
export interface ReportConfig {
  date_range: {
    start_date: string;
    end_date: string;
    preset?: DateRange;
  };
  filters: {
    accounts?: string[];
    categories?: string[];
    transaction_types?: ('income' | 'expense')[];
    amount_range?: {
      min: number;
      max: number;
    };
  };
  grouping: {
    by_category?: boolean;
    by_account?: boolean;
    by_date?: PeriodType;
    by_member?: boolean;
  };
  visualization: {
    chart_types: Record<string, ChartType>;
    show_trends: boolean;
    show_comparisons: boolean;
  };
}

// Report execution history
export interface ReportExecution {
  id: string;
  report_id: string;
  executed_by?: string;
  status: ReportStatus;
  execution_time_ms?: number;
  result_data?: any;
  error_message?: string;
  exported_files: ExportedFile[];
  executed_at: string;
  completed_at?: string;
}

// Exported file information
export interface ExportedFile {
  format: ExportFormat;
  filename: string;
  url: string;
  size_bytes: number;
  created_at: string;
}

// Analytics preferences
export interface AnalyticsPreferences {
  id: string;
  family_id: string;
  default_date_range: DateRange;
  preferred_chart_types: Record<string, ChartType>;
  currency_display: string;
  number_format: string;
  enable_insights: boolean;
  enable_budget_alerts: boolean;
  enable_trend_alerts: boolean;
  created_at: string;
  updated_at: string;
}

// Dashboard widget configuration
export interface DashboardWidget {
  id: string;
  type: 'income_expense_chart' | 'category_breakdown' | 'budget_progress' | 'trend_analysis' | 'recent_transactions' | 'account_balances';
  title: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config: {
    date_range?: DateRange;
    chart_type?: ChartType;
    accounts?: string[];
    categories?: string[];
    limit?: number;
  };
  is_visible: boolean;
}

// Chart data structures
export interface ChartDataPoint {
  label: string;
  value: number;
  percentage?: number;
  color?: string;
  metadata?: Record<string, any>;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  category?: string;
  metadata?: Record<string, any>;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
}

// Analytics insights and recommendations
export interface Insight {
  id: string;
  type: 'spending_trend' | 'budget_warning' | 'category_anomaly' | 'savings_opportunity' | 'recurring_pattern';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  impact_score: number; // 0-100
  recommendations: Recommendation[];
  data: Record<string, any>;
  created_at: string;
  is_dismissed: boolean;
}

export interface Recommendation {
  action: string;
  description: string;
  potential_savings?: number;
  effort_level: 'low' | 'medium' | 'high';
  category?: string;
}

// Spending analysis structures
export interface SpendingPattern {
  category: string;
  monthly_average: number;
  trend: number; // Percentage change
  seasonality: Record<string, number>; // Month -> multiplier
  weekly_distribution: number[]; // Day of week spending distribution
  recurring_transactions: RecurringTransaction[];
}

export interface RecurringTransaction {
  description: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  confidence: number; // 0-1, how confident we are this is recurring
  next_predicted_date: string;
}

// Family insights
export interface FamilyMemberSpending {
  user_id: string;
  user_name: string;
  total_spending: number;
  top_categories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  spending_trend: number;
  most_active_day: string;
  average_transaction_amount: number;
}

export interface FamilyInsights {
  family_id: string;
  total_members: number;
  period_start: string;
  period_end: string;
  member_spending: FamilyMemberSpending[];
  shared_expenses: {
    total: number;
    categories: Record<string, number>;
  };
  savings_goals: {
    target: number;
    current: number;
    monthly_progress: number;
    projected_completion: string;
  };
  spending_distribution: {
    needs: number; // Essential expenses
    wants: number; // Non-essential expenses
    savings: number; // Money saved/invested
  };
}

// API response types
export interface AnalyticsResponse<T> {
  data: T;
  metadata: {
    period: {
      start: string;
      end: string;
      type: PeriodType;
    };
    filters_applied: Record<string, any>;
    generated_at: string;
    cache_expires_at?: string;
  };
}

export interface DashboardData {
  financial_summary: {
    total_income: number;
    total_expenses: number;
    net_income: number;
    previous_period_comparison: {
      income_change: number;
      expense_change: number;
      net_change: number;
    };
  };
  top_categories: {
    income: ChartDataPoint[];
    expenses: ChartDataPoint[];
  };
  recent_trends: TimeSeriesDataPoint[];
  budget_status: BudgetPerformance[];
  account_balances: ChartDataPoint[];
  insights: Insight[];
  quick_stats: {
    transactions_this_month: number;
    largest_expense: {
      amount: number;
      description: string;
      category: string;
    };
    savings_rate: number;
    spending_velocity: number; // Transactions per day
  };
}