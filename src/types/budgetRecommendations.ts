// Budget Recommendations Type Definitions

export interface BudgetRecommendation {
  recommendation_type: 'reduce_category' | 'emergency_fund' | 'increase_savings';
  category_name: string;
  current_spending: number;
  recommended_budget: number;
  potential_savings: number;
  confidence_score: number; // 0.0 to 1.0
  reason: string;
  action_items: {
    set_monthly_limit?: number;
    track_daily?: boolean;
    review_frequency?: 'daily' | 'weekly' | 'monthly';
    suggest_alternatives?: boolean;
    start_amount?: number;
    monthly_target?: number;
    automate?: boolean;
    separate_account?: boolean;
    current_savings_rate?: number;
    target_savings_rate?: number;
    monthly_savings_target?: number;
    investment_consideration?: boolean;
  };
}

export interface BudgetTemplate {
  template_name: string;
  template_description: string;
  category_allocations: Record<string, number>;
  suitability_score: number; // 0.0 to 1.0
  pros_cons: {
    pros: string[];
    cons: string[];
  };
}

export interface BudgetPerformance {
  category_name: string;
  budgeted_amount: number;
  actual_spent: number;
  variance: number;
  variance_percentage: number;
  performance_status: 'Under Budget' | 'On Track' | 'Slightly Over' | 'Over Budget';
  recommendation: string;
}

export interface BudgetRecommendationsData {
  recommendations: BudgetRecommendation[];
  templates: BudgetTemplate[];
  performance?: BudgetPerformance[];
  totalPotentialSavings: number;
  highConfidenceRecommendations: BudgetRecommendation[];
  emergencyFundStatus: {
    hasRecommendation: boolean;
    targetAmount?: number;
    currentProgress?: number;
  };
}

export interface UseBudgetRecommendationsOptions {
  dateRange?: {
    start: string;
    end: string;
  };
  monthlyIncome?: number;
  budgetData?: Record<string, number>;
  autoFetch?: boolean;
}

export interface BudgetRecommendationsResponse {
  data: BudgetRecommendationsData | null;
  loading: boolean;
  error: string | null;
  lastUpdated?: Date;
}

export type BudgetRecommendationType = 'reduce_category' | 'emergency_fund' | 'increase_savings';

export interface BudgetAllocation {
  category: string;
  amount: number;
  percentage: number;
}

export interface BudgetSummary {
  totalIncome: number;
  totalBudgeted: number;
  totalSpent: number;
  remainingBudget: number;
  savingsTarget: number;
  actualSavings: number;
  budgetUtilization: number; // Percentage of budget used
}

export interface BudgetGoal {
  id: string;
  category: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  priority: 'high' | 'medium' | 'low';
  achieved: boolean;
}

export interface SmartBudgetInsight {
  type: 'overspending' | 'opportunity' | 'achievement' | 'warning';
  category: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  suggestedAction?: string;
}