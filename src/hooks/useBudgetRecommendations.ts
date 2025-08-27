import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/hooks/useFamily';
import { useLogger } from '@/hooks/useLogger';
import { useEnhancedToast } from '@/hooks/useEnhancedToast';
import type {
  BudgetRecommendationsData,
  BudgetRecommendation,
  BudgetTemplate,
  BudgetPerformance,
  UseBudgetRecommendationsOptions,
  BudgetRecommendationsResponse
} from '@/types/budgetRecommendations';

export const useBudgetRecommendations = (
  options: UseBudgetRecommendationsOptions = {}
): BudgetRecommendationsResponse & {
  fetchRecommendations: (customOptions?: Partial<UseBudgetRecommendationsOptions>) => Promise<void>;
  refreshRecommendations: () => Promise<void>;
  getBudgetPerformance: (budgetData: Record<string, number>) => Promise<BudgetPerformance[]>;
} => {
  const {
    dateRange = {
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days ago
      end: new Date().toISOString().split('T')[0]
    },
    monthlyIncome = 0,
    budgetData,
    autoFetch = false
  } = options;

  const { user } = useAuth();
  const { currentFamily } = useFamily();
  const { logInfo, logError } = useLogger();
  const toast = useEnhancedToast();

  const [data, setData] = useState<BudgetRecommendationsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>();

  // Helper function to process recommendations data
  const processRecommendationsData = useCallback((
    recommendations: any[],
    templates: any[]
  ): BudgetRecommendationsData => {
    const processedRecommendations: BudgetRecommendation[] = recommendations.map((rec: any) => ({
      recommendation_type: rec.recommendation_type,
      category_name: rec.category_name,
      current_spending: parseFloat(rec.current_spending || '0'),
      recommended_budget: parseFloat(rec.recommended_budget || '0'),
      potential_savings: parseFloat(rec.potential_savings || '0'),
      confidence_score: parseFloat(rec.confidence_score || '0'),
      reason: rec.reason || '',
      action_items: rec.action_items || {}
    }));

    const processedTemplates: BudgetTemplate[] = templates.map((template: any) => ({
      template_name: template.template_name,
      template_description: template.template_description,
      category_allocations: template.category_allocations || {},
      suitability_score: parseFloat(template.suitability_score || '0'),
      pros_cons: template.pros_cons || { pros: [], cons: [] }
    }));

    const totalPotentialSavings = processedRecommendations.reduce(
      (sum, rec) => sum + rec.potential_savings, 0
    );

    const highConfidenceRecommendations = processedRecommendations.filter(
      rec => rec.confidence_score >= 0.8
    );

    const emergencyFundRecommendation = processedRecommendations.find(
      rec => rec.recommendation_type === 'emergency_fund'
    );

    return {
      recommendations: processedRecommendations,
      templates: processedTemplates,
      totalPotentialSavings,
      highConfidenceRecommendations,
      emergencyFundStatus: {
        hasRecommendation: !!emergencyFundRecommendation,
        targetAmount: emergencyFundRecommendation?.recommended_budget,
        currentProgress: 0 // Could be calculated based on actual savings data
      }
    };
  }, []);

  // Main function to fetch budget recommendations
  const fetchRecommendations = useCallback(async (
    customOptions?: Partial<UseBudgetRecommendationsOptions>
  ) => {
    if (!currentFamily || !user) return;

    const effectiveOptions = { ...options, ...customOptions };
    const period = effectiveOptions.dateRange || dateRange;
    const income = effectiveOptions.monthlyIncome || monthlyIncome;

    setLoading(true);
    setError(null);

    try {
      await logInfo('Fetching budget recommendations', {
        family_id: currentFamily.id,
        date_range: period,
        monthly_income: income
      }, 'analytics', 'budget-recommendations');

      // Fetch budget recommendations
      const { data: recommendationsData, error: recommendationsError } = await supabase
        .rpc('get_budget_recommendations', {
          family_id_param: currentFamily.id,
          start_date_param: period.start,
          end_date_param: period.end
        });

      if (recommendationsError) throw recommendationsError;

      // Fetch budget templates if income is provided
      let templatesData: any[] = [];
      if (income > 0) {
        const { data: templates, error: templatesError } = await supabase
          .rpc('get_budget_templates', {
            family_id_param: currentFamily.id,
            monthly_income_param: income
          });

        if (templatesError) {
          console.warn('Failed to fetch budget templates:', templatesError);
        } else {
          templatesData = templates || [];
        }
      }

      // Process and combine the data
      const budgetData = processRecommendationsData(
        recommendationsData || [],
        templatesData
      );

      setData(budgetData);
      setLastUpdated(new Date());

      await logInfo('Budget recommendations fetched successfully', {
        family_id: currentFamily.id,
        recommendations_count: budgetData.recommendations.length,
        templates_count: budgetData.templates.length,
        total_potential_savings: budgetData.totalPotentialSavings
      }, 'analytics', 'budget-recommendations');

    } catch (err: any) {
      console.error('Error fetching budget recommendations:', err);
      const errorMessage = err.message || 'Failed to fetch budget recommendations';
      setError(errorMessage);
      
      await logError('Failed to fetch budget recommendations', err, {
        family_id: currentFamily.id,
        date_range: period
      }, 'analytics', 'budget-recommendations');
      
      toast.apiError(err, 'fetching budget recommendations');
    } finally {
      setLoading(false);
    }
  }, [currentFamily, user, dateRange, monthlyIncome, logInfo, logError, toast, processRecommendationsData]);

  // Function to get budget performance analysis
  const getBudgetPerformance = useCallback(async (
    budgetAllocations: Record<string, number>
  ): Promise<BudgetPerformance[]> => {
    if (!currentFamily || !budgetAllocations) return [];

    try {
      const { data: performanceData, error } = await supabase
        .rpc('get_budget_performance', {
          family_id_param: currentFamily.id,
          budget_data: budgetAllocations,
          start_date_param: dateRange.start,
          end_date_param: dateRange.end
        });

      if (error) throw error;

      return (performanceData || []).map((perf: any) => ({
        category_name: perf.category_name,
        budgeted_amount: parseFloat(perf.budgeted_amount || '0'),
        actual_spent: parseFloat(perf.actual_spent || '0'),
        variance: parseFloat(perf.variance || '0'),
        variance_percentage: parseFloat(perf.variance_percentage || '0'),
        performance_status: perf.performance_status,
        recommendation: perf.recommendation || ''
      }));

    } catch (err: any) {
      console.error('Error fetching budget performance:', err);
      toast.apiError(err, 'analyzing budget performance');
      return [];
    }
  }, [currentFamily, dateRange, supabase, toast]);

  // Refresh recommendations with loading state
  const refreshRecommendations = useCallback(async () => {
    if (!currentFamily) return;
    
    // Use the loading toast properly with a promise
    toast.loading(fetchRecommendations(), {
      title: 'Refreshing budget recommendations...',
      onComplete: () => {
        toast.success({ title: 'Budget recommendations updated' });
      },
      onError: (error) => {
        console.error('Error refreshing recommendations:', error);
      }
    });
  }, [fetchRecommendations, toast, currentFamily]);

  // Removed auto-fetch to prevent continuous refreshing - data loads only on explicit user action

  // Removed auto-refresh interval for better UX - data should only refresh when explicitly requested by user

  return {
    data,
    loading,
    error,
    lastUpdated,
    fetchRecommendations,
    refreshRecommendations,
    getBudgetPerformance
  };
};