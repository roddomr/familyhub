// TypeScript types for Family Insights and Multi-Member Spending Analysis

export interface FamilyMemberSpending {
  user_id: string;
  full_name: string;
  role: 'admin' | 'parent' | 'member' | 'child';
  total_expenses: number;
  total_income: number;
  transaction_count: number;
  avg_transaction_amount: number;
  most_used_category: string;
  spending_trend: number; // Percentage change
  category_breakdown: Record<string, number>;
}

export interface SharedVsIndividualExpense {
  analysis_type: 'shared' | 'individual';
  total_amount: number;
  transaction_count: number;
  avg_amount: number;
  percentage_of_total: number;
  top_categories: Record<string, number>;
}

export interface FamilySpendingComparison {
  comparison_metric: 'total_expenses' | 'transaction_count' | 'avg_transaction_amount';
  member_name: string;
  member_role: string;
  value: number;
  rank_position: number; // Will be parsed from BIGINT to number
  percentage_of_family_total: number;
}

export interface FamilyFinancialHealthInsight {
  insight_type: string;
  insight_title: string;
  insight_description: string;
  impact_level: 'high' | 'medium' | 'low';
  recommended_action: string;
  supporting_data: Record<string, any>;
}

export interface FamilyInsightsData {
  memberSpending: FamilyMemberSpending[];
  sharedVsIndividual: SharedVsIndividualExpense[];
  spendingComparison: FamilySpendingComparison[];
  financialHealthInsights: FamilyFinancialHealthInsight[];
  period: {
    start: string;
    end: string;
    label: string;
  };
  familyTotals: {
    totalIncome: number;
    totalExpenses: number;
    netIncome: number;
    memberCount: number;
    transactionCount: number;
    avgMemberExpenses: number;
  };
}

export interface SpendingPattern {
  category: string;
  amount: number;
  percentage: number;
  trend: number;
  memberContributions: Array<{
    member_name: string;
    amount: number;
    percentage: number;
  }>;
}

export interface FamilyMemberProfile {
  user_id: string;
  full_name: string;
  role: string;
  avatar_url?: string;
  spending_personality: 'conservative' | 'moderate' | 'liberal' | 'variable';
  primary_categories: string[];
  monthly_avg_expenses: number;
  monthly_avg_income: number;
}

export interface FamilySpendingTrend {
  date: string;
  members: Array<{
    member_name: string;
    amount: number;
  }>;
  total: number;
}

export interface CategoryInsight {
  category: string;
  total_amount: number;
  member_breakdown: Array<{
    member_name: string;
    amount: number;
    percentage_of_category: number;
    percentage_of_member_total: number;
  }>;
  is_shared_expense: boolean;
  recommendation?: string;
}

export interface BudgetComplianceByMember {
  member_name: string;
  member_role: string;
  categories: Array<{
    category: string;
    budgeted: number;
    actual: number;
    variance: number;
    compliance_percentage: number;
  }>;
  overall_compliance: number;
}

// Request/Response types for hooks
export interface UseFamilyInsightsOptions {
  dateRange?: {
    start: string;
    end: string;
  };
  autoFetch?: boolean;
}

export interface FamilyInsightsResponse {
  data: FamilyInsightsData | null;
  loading: boolean;
  error: string | null;
  lastUpdated?: Date;
}

// Chart data types for visualizations
export interface MemberSpendingChartData {
  member_name: string;
  role: string;
  expenses: number;
  income: number;
  net: number;
  color: string;
}

export interface CategoryComparisonChartData {
  category: string;
  shared: number;
  individual: number;
  total: number;
}

export interface SpendingTrendChartData {
  date: string;
  [memberName: string]: number | string; // Dynamic member names as keys
}

export interface MemberRankingChartData {
  member_name: string;
  role: string;
  value: number;
  rank: number;
  percentage: number;
}