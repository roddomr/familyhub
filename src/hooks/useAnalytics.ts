import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useFamily } from '@/hooks/useFamily';
import { useLogger } from '@/hooks/useLogger';
import { useEnhancedToast } from '@/hooks/useEnhancedToast';
import type {
  FinancialInsight,
  DashboardData,
  AnalyticsPreferences,
  SavedReport,
  ReportExecution,
  UserActivityMetrics,
  FamilyInsights,
  Insight,
  DateRange,
  PeriodType,
  ReportConfig,
  SpendingPattern,
  ChartDataPoint,
  TimeSeriesDataPoint,
  AnalyticsResponse
} from '@/types/analytics';

interface UseAnalyticsOptions {
  autoFetch?: boolean;
  dateRange?: DateRange;
  cacheTimeout?: number; // in milliseconds
}

export const useAnalytics = (options: UseAnalyticsOptions = {}) => {
  const { autoFetch = true, dateRange = 'last_30_days', cacheTimeout = 5 * 60 * 1000 } = options;
  
  const { user } = useAuth();
  const { currentFamily } = useFamily();
  const { logInfo, logError } = useLogger();
  const toast = useEnhancedToast();

  // State management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [preferences, setPreferences] = useState<AnalyticsPreferences | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [cache, setCache] = useState<Map<string, { data: any; timestamp: number }>>(new Map());

  // Utility function to get date range boundaries
  const getDateRangeBoundaries = useCallback((range: DateRange) => {
    const now = new Date();
    const start = new Date();
    
    switch (range) {
      case 'last_7_days':
        start.setDate(now.getDate() - 7);
        break;
      case 'last_30_days':
        start.setDate(now.getDate() - 30);
        break;
      case 'last_90_days':
        start.setDate(now.getDate() - 90);
        break;
      case 'last_year':
        start.setFullYear(now.getFullYear() - 1);
        break;
      case 'current_month':
        start.setDate(1);
        break;
      case 'current_year':
        start.setMonth(0, 1);
        break;
      default:
        start.setDate(now.getDate() - 30);
    }
    
    return {
      start: start.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0]
    };
  }, []);

  // Cache management
  const getCachedData = useCallback((key: string) => {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < cacheTimeout) {
      return cached.data;
    }
    return null;
  }, [cache, cacheTimeout]);

  const setCachedData = useCallback((key: string, data: any) => {
    setCache(prev => new Map(prev).set(key, { data, timestamp: Date.now() }));
  }, []);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async (range: DateRange = dateRange) => {
    if (!currentFamily || !user) return null;

    const cacheKey = `dashboard-${currentFamily.id}-${range}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    setLoading(true);
    setError(null);

    try {
      await logInfo('Fetching analytics dashboard data', {
        family_id: currentFamily.id,
        date_range: range
      }, 'analytics', 'dashboard');

      const { start, end } = getDateRangeBoundaries(range);

      // Fetch financial insights
      const { data: insightsData, error: insightsError } = await supabase
        .from('financial_insights')
        .select('*')
        .eq('family_id', currentFamily.id)
        .gte('period_start', start)
        .lte('period_end', end)
        .order('period_start', { ascending: false });

      if (insightsError) throw insightsError;

      // Fetch recent transactions for trends
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          *,
          transaction_categories(name, color),
          financial_accounts(name)
        `)
        .eq('family_id', currentFamily.id)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true });

      if (transactionsError) throw transactionsError;

      // Fetch current account balances
      const { data: accountsData, error: accountsError } = await supabase
        .from('financial_accounts')
        .select('*')
        .eq('family_id', currentFamily.id)
        .eq('is_active', true);

      if (accountsError) throw accountsError;

      // Process data into dashboard format
      const dashboard = processDashboardData(insightsData, transactionsData, accountsData, { start, end });
      
      setCachedData(cacheKey, dashboard);
      setDashboardData(dashboard);
      setTransactions(transactionsData || []);

      await logInfo('Successfully fetched analytics dashboard data', {
        insights_count: insightsData?.length || 0,
        transactions_count: transactionsData?.length || 0,
        accounts_count: accountsData?.length || 0
      }, 'analytics', 'dashboard');

      return dashboard;
    } catch (err: any) {
      await logError('Error fetching dashboard data', {
        error: err.message,
        family_id: currentFamily.id
      }, 'analytics', 'dashboard', 'FETCH_ERROR');
      
      const errorMessage = 'Failed to load analytics data';
      setError(errorMessage);
      toast.apiError(err, 'fetching analytics data');
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentFamily, user, dateRange, getDateRangeBoundaries, getCachedData, setCachedData, logInfo, logError, toast]);

  // Process raw data into dashboard format
  const processDashboardData = useCallback((
    insights: any[],
    transactions: any[],
    accounts: any[],
    period: { start: string; end: string }
  ): DashboardData => {
    // Calculate financial summary
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Category breakdowns
    const categoryTotals = transactions.reduce((acc, t) => {
      const category = t.transaction_categories?.name || 'Uncategorized';
      const type = t.type as 'income' | 'expense';
      
      if (!acc[type]) acc[type] = {};
      acc[type][category] = (acc[type][category] || 0) + Number(t.amount);
      
      return acc;
    }, {} as Record<'income' | 'expense', Record<string, number>>);

    // Convert to chart data points
    const topIncomeCategories: ChartDataPoint[] = Object.entries(categoryTotals.income || {})
      .map(([label, value]) => ({
        label,
        value,
        percentage: totalIncome > 0 ? (value / totalIncome) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const topExpenseCategories: ChartDataPoint[] = Object.entries(categoryTotals.expense || {})
      .map(([label, value]) => ({
        label,
        value,
        percentage: totalExpenses > 0 ? (value / totalExpenses) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Generate trends (daily aggregation)
    const dailyTrends = generateDailyTrends(transactions, period);

    // Account balances
    const accountBalances: ChartDataPoint[] = accounts.map(account => ({
      label: account.name,
      value: Number(account.balance)
    }));

    // Find largest expense
    const largestExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((max, t) => Number(t.amount) > Number(max.amount) ? t : max, transactions[0] || { amount: 0, description: '', transaction_categories: null });

    return {
      financial_summary: {
        total_income: totalIncome,
        total_expenses: totalExpenses,
        net_income: totalIncome - totalExpenses,
        previous_period_comparison: {
          income_change: 0, // TODO: Calculate from previous period
          expense_change: 0,
          net_change: 0
        }
      },
      top_categories: {
        income: topIncomeCategories,
        expenses: topExpenseCategories
      },
      recent_trends: dailyTrends,
      budget_status: [], // TODO: Calculate from budgets
      account_balances: accountBalances,
      insights: [], // TODO: Generate insights
      quick_stats: {
        transactions_this_month: transactions.length,
        largest_expense: {
          amount: Number(largestExpense?.amount || 0),
          description: largestExpense?.description || '',
          category: largestExpense?.transaction_categories?.name || 'Uncategorized'
        },
        savings_rate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0,
        spending_velocity: transactions.filter(t => t.type === 'expense').length / 30 // per day
      }
    };
  }, []);

  // Generate daily trends
  const generateDailyTrends = useCallback((transactions: any[], period: { start: string; end: string }) => {
    const dailyData: Record<string, { income: number; expense: number }> = {};
    
    // Initialize all days in range
    const startDate = new Date(period.start);
    const endDate = new Date(period.end);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dailyData[dateStr] = { income: 0, expense: 0 };
    }
    
    // Aggregate transactions by day
    transactions.forEach(t => {
      const date = t.date;
      if (dailyData[date]) {
        dailyData[date][t.type as 'income' | 'expense'] += Number(t.amount);
      }
    });
    
    // Convert to time series data
    return Object.entries(dailyData).map(([date, data]) => ({
      date,
      value: data.income - data.expense,
      metadata: { income: data.income, expense: data.expense }
    }));
  }, []);

  // Fetch analytics preferences
  const fetchPreferences = useCallback(async () => {
    if (!currentFamily) return null;

    try {
      const { data, error } = await supabase
        .from('analytics_preferences')
        .select('*')
        .eq('family_id', currentFamily.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPreferences(data);
        return data;
      }

      // Create default preferences if none exist
      const defaultPreferences = {
        family_id: currentFamily.id,
        default_date_range: 'last_30_days' as DateRange,
        preferred_chart_types: {
          income_expense: 'bar',
          category_breakdown: 'pie',
          trends: 'line',
          budget_progress: 'progress'
        },
        currency_display: 'USD',
        number_format: 'en-US',
        enable_insights: true,
        enable_budget_alerts: true,
        enable_trend_alerts: true
      };

      const { data: newPrefs, error: createError } = await supabase
        .from('analytics_preferences')
        .insert(defaultPreferences)
        .select()
        .single();

      if (createError) throw createError;

      setPreferences(newPrefs);
      return newPrefs;
    } catch (err: any) {
      await logError('Error fetching analytics preferences', {
        error: err.message,
        family_id: currentFamily.id
      }, 'analytics', 'preferences', 'FETCH_ERROR');
      return null;
    }
  }, [currentFamily, logError]);

  // Update preferences
  const updatePreferences = useCallback(async (updates: Partial<AnalyticsPreferences>) => {
    if (!currentFamily || !preferences) return false;

    try {
      const { data, error } = await supabase
        .from('analytics_preferences')
        .update(updates)
        .eq('family_id', currentFamily.id)
        .select()
        .single();

      if (error) throw error;

      setPreferences(data);
      toast.success({
        title: 'Preferences Updated',
        description: 'Your analytics preferences have been saved.'
      });

      // Clear cache to force refresh
      setCache(new Map());

      return true;
    } catch (err: any) {
      await logError('Error updating analytics preferences', {
        error: err.message,
        updates
      }, 'analytics', 'preferences', 'UPDATE_ERROR');
      
      toast.apiError(err, 'updating preferences');
      return false;
    }
  }, [currentFamily, preferences, toast, logError]);

  // Calculate financial insights
  const calculateInsights = useCallback(async (range: DateRange = dateRange) => {
    if (!currentFamily) return;

    try {
      const { start, end } = getDateRangeBoundaries(range);
      
      // Call the database function to calculate insights
      const { error } = await supabase.rpc('calculate_financial_insights', {
        family_id_param: currentFamily.id,
        period_type_param: 'monthly',
        period_start_param: start,
        period_end_param: end
      });

      if (error) throw error;

      await logInfo('Successfully calculated financial insights', {
        family_id: currentFamily.id,
        period: { start, end }
      }, 'analytics', 'insights');

      // Refresh dashboard data
      await fetchDashboardData(range);
    } catch (err: any) {
      await logError('Error calculating insights', {
        error: err.message,
        family_id: currentFamily.id
      }, 'analytics', 'insights', 'CALCULATION_ERROR');
    }
  }, [currentFamily, dateRange, getDateRangeBoundaries, fetchDashboardData, logInfo, logError]);

  // Track user activity
  const trackActivity = useCallback(async (activityType: string) => {
    if (!currentFamily || !user) return;

    try {
      const { error } = await supabase.rpc('track_user_activity', {
        family_id_param: currentFamily.id,
        user_id_param: user.id,
        activity_type: activityType
      });

      if (error) throw error;
    } catch (err: any) {
      // Log but don't show error to user for activity tracking
      await logError('Error tracking user activity', {
        error: err.message,
        activity_type: activityType
      }, 'analytics', 'activity', 'TRACKING_ERROR');
    }
  }, [currentFamily, user, logError]);

  // Initialize analytics data
  useEffect(() => {
    if (autoFetch && currentFamily) {
      fetchDashboardData();
      fetchPreferences();
    }
  }, [autoFetch, currentFamily, fetchDashboardData, fetchPreferences]);

  return {
    // State
    loading,
    error,
    dashboardData,
    preferences,
    insights,
    transactions,

    // Actions
    fetchDashboardData,
    fetchPreferences,
    updatePreferences,
    calculateInsights,
    trackActivity,

    // Utilities
    getDateRangeBoundaries,
    
    // Cache management
    clearCache: () => setCache(new Map())
  };
};