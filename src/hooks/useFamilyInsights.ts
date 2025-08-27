import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/hooks/useFamily';
import { useLogger } from '@/hooks/useLogger';
import { useEnhancedToast } from '@/hooks/useEnhancedToast';
import type {
  FamilyInsightsData,
  FamilyMemberSpending,
  SharedVsIndividualExpense,
  FamilySpendingComparison,
  FamilyFinancialHealthInsight,
  UseFamilyInsightsOptions,
  FamilyInsightsResponse
} from '@/types/familyInsights';

export const useFamilyInsights = (options: UseFamilyInsightsOptions = {}): FamilyInsightsResponse & {
  fetchInsights: (dateRange?: { start: string; end: string }) => Promise<void>;
  refreshInsights: () => Promise<void>;
} => {
  const { 
    dateRange = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    autoFetch = false
  } = options;

  const { user } = useAuth();
  const { currentFamily } = useFamily();
  const { logInfo, logError } = useLogger();
  const toast = useEnhancedToast();

  const [data, setData] = useState<FamilyInsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>();

  // Helper function to calculate family totals
  const calculateFamilyTotals = useCallback((memberSpending: FamilyMemberSpending[]) => {
    const totals = memberSpending.reduce(
      (acc, member) => ({
        totalIncome: acc.totalIncome + member.total_income,
        totalExpenses: acc.totalExpenses + member.total_expenses,
        memberCount: acc.memberCount + 1,
        transactionCount: acc.transactionCount + member.transaction_count
      }),
      { totalIncome: 0, totalExpenses: 0, memberCount: 0, transactionCount: 0 }
    );

    return {
      ...totals,
      netIncome: totals.totalIncome - totals.totalExpenses,
      avgMemberExpenses: totals.memberCount > 0 ? totals.totalExpenses / totals.memberCount : 0
    };
  }, []);

  // Main function to fetch family insights
  const fetchInsights = useCallback(async (customDateRange?: { start: string; end: string }) => {
    if (!currentFamily || !user) return;

    const period = customDateRange || dateRange;
    setLoading(true);
    setError(null);

    try {
      await logInfo('Fetching family insights', {
        family_id: currentFamily.id,
        date_range: period
      }, 'analytics', 'family-insights');

      // Fetch member spending patterns
      const { data: memberSpendingData, error: memberSpendingError } = await supabase
        .rpc('get_family_spending_patterns', {
          family_id_param: currentFamily.id,
          start_date_param: period.start,
          end_date_param: period.end
        });

      if (memberSpendingError) throw memberSpendingError;

      // Fetch shared vs individual expenses
      const { data: sharedVsIndividualData, error: sharedVsIndividualError } = await supabase
        .rpc('get_shared_vs_individual_expenses', {
          family_id_param: currentFamily.id,
          start_date_param: period.start,
          end_date_param: period.end
        });

      if (sharedVsIndividualError) throw sharedVsIndividualError;

      // Fetch spending comparison rankings
      const { data: spendingComparisonData, error: spendingComparisonError } = await supabase
        .rpc('get_family_spending_comparison', {
          family_id_param: currentFamily.id,
          start_date_param: period.start,
          end_date_param: period.end
        });

      if (spendingComparisonError) throw spendingComparisonError;

      // Fetch financial health insights
      const { data: healthInsightsData, error: healthInsightsError } = await supabase
        .rpc('get_family_financial_health_insights', {
          family_id_param: currentFamily.id,
          start_date_param: period.start,
          end_date_param: period.end
        });

      if (healthInsightsError) throw healthInsightsError;

      // Process and combine the data
      const memberSpending: FamilyMemberSpending[] = (memberSpendingData || []).map((member: any) => ({
        user_id: member.user_id,
        full_name: member.full_name || 'Unknown Member',
        role: member.role,
        total_expenses: parseFloat(member.total_expenses || '0'),
        total_income: parseFloat(member.total_income || '0'),
        transaction_count: parseInt(member.transaction_count || '0'),
        avg_transaction_amount: parseFloat(member.avg_transaction_amount || '0'),
        most_used_category: member.most_used_category || 'None',
        spending_trend: parseFloat(member.spending_trend || '0'),
        category_breakdown: member.category_breakdown || {}
      }));

      const sharedVsIndividual: SharedVsIndividualExpense[] = (sharedVsIndividualData || []).map((item: any) => ({
        analysis_type: item.analysis_type,
        total_amount: parseFloat(item.total_amount || '0'),
        transaction_count: parseInt(item.transaction_count || '0'),
        avg_amount: parseFloat(item.avg_amount || '0'),
        percentage_of_total: parseFloat(item.percentage_of_total || '0'),
        top_categories: item.top_categories || {}
      }));

      const spendingComparison: FamilySpendingComparison[] = (spendingComparisonData || []).map((item: any) => ({
        comparison_metric: item.comparison_metric,
        member_name: item.member_name || 'Unknown Member',
        member_role: item.member_role,
        value: parseFloat(item.value || '0'),
        rank_position: parseInt(item.rank_position || '0'),
        percentage_of_family_total: parseFloat(item.percentage_of_family_total || '0')
      }));

      const financialHealthInsights: FamilyFinancialHealthInsight[] = (healthInsightsData || []).map((insight: any) => ({
        insight_type: insight.insight_type,
        insight_title: insight.insight_title,
        insight_description: insight.insight_description,
        impact_level: insight.impact_level,
        recommended_action: insight.recommended_action,
        supporting_data: insight.supporting_data || {}
      }));

      const familyTotals = calculateFamilyTotals(memberSpending);

      const insightsData: FamilyInsightsData = {
        memberSpending,
        sharedVsIndividual,
        spendingComparison,
        financialHealthInsights,
        period: {
          start: period.start,
          end: period.end,
          label: formatDateRangeLabel(period.start, period.end)
        },
        familyTotals
      };

      setData(insightsData);
      setLastUpdated(new Date());

      await logInfo('Family insights fetched successfully', {
        family_id: currentFamily.id,
        member_count: memberSpending.length,
        insights_count: financialHealthInsights.length,
        total_expenses: familyTotals.totalExpenses
      }, 'analytics', 'family-insights');

    } catch (err: any) {
      console.error('Error fetching family insights:', err);
      const errorMessage = err.message || 'Failed to fetch family insights';
      setError(errorMessage);
      
      await logError('Failed to fetch family insights', err, {
        family_id: currentFamily.id,
        date_range: period
      }, 'analytics', 'family-insights');
      
      toast.apiError(err, 'fetching family insights');
    } finally {
      setLoading(false);
    }
  }, [currentFamily, user, dateRange, logInfo, logError, toast, calculateFamilyTotals]);

  // Refresh insights - same as fetch but with loading toast
  const refreshInsights = useCallback(async () => {
    if (!currentFamily) return;
    
    // Use the loading toast properly with a promise
    toast.loading(fetchInsights(), {
      title: 'Refreshing family insights...',
      onComplete: () => {
        toast.success({ title: 'Family insights updated' });
      },
      onError: (error) => {
        console.error('Error refreshing insights:', error);
      }
    });
  }, [fetchInsights, toast, currentFamily]);

  // Removed auto-fetch to prevent continuous refreshing - data loads only on explicit user action

  // Removed auto-refresh interval for better UX - data should only refresh when explicitly requested by user

  return {
    data,
    loading,
    error,
    lastUpdated,
    fetchInsights,
    refreshInsights
  };
};

// Helper function to format date range labels
function formatDateRangeLabel(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 7) {
    return 'Last 7 Days';
  } else if (diffDays <= 30) {
    return 'Last 30 Days';
  } else if (diffDays <= 90) {
    return 'Last 90 Days';
  } else {
    const startMonth = startDate.toLocaleString('en-US', { month: 'short' });
    const endMonth = endDate.toLocaleString('en-US', { month: 'short' });
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    
    if (startYear === endYear) {
      return `${startMonth} - ${endMonth} ${startYear}`;
    } else {
      return `${startMonth} ${startYear} - ${endMonth} ${endYear}`;
    }
  }
}