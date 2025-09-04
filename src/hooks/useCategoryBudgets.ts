import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useFamily } from '@/hooks/useFamily';
import { useLogger } from '@/hooks/useLogger';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { sanitizeText } from '@/lib/security/validation';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types';
import type { TransactionCategory } from './useCategories';

export type CategoryBudget = Tables<'category_budgets'> & {
  category?: TransactionCategory;
  current_summary?: CategoryBudgetSummary;
};

export type CategoryBudgetSummary = Tables<'category_budget_summaries'> & {
  budget?: CategoryBudget;
  percentage_used?: number;
  is_over_budget?: boolean;
  days_remaining?: number;
};

interface CreateBudgetData {
  category_id: string;
  name: string;
  amount: number;
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  start_date: string;
  end_date?: string;
  alert_threshold?: number;
  alert_enabled?: boolean;
  rollover_enabled?: boolean;
  rollover_limit?: number;
}

interface UpdateBudgetData {
  name?: string;
  amount?: number;
  period?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  start_date?: string;
  end_date?: string;
  alert_threshold?: number;
  alert_enabled?: boolean;
  rollover_enabled?: boolean;
  rollover_limit?: number;
  is_active?: boolean;
}

interface BudgetAlert {
  budget_id: string;
  category_name: string;
  budget_name: string;
  amount: number;
  spent: number;
  percentage: number;
  threshold: number;
  period: string;
  severity: 'warning' | 'danger';
}

export const useCategoryBudgets = () => {
  const { currentFamily } = useFamily();
  const { user } = useAuth();
  const { logInfo, logError } = useLogger();
  const { logTransaction } = useAuditLog();
  
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [budgetSummaries, setBudgetSummaries] = useState<CategoryBudgetSummary[]>([]);
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [loading, setLoading] = useState(false);

  // Load budgets with current summaries
  const loadBudgets = useCallback(async () => {
    if (!currentFamily || loading) return; // Prevent concurrent loads

    setLoading(true);
    try {
      // Log info without dependency
      try {
        await logInfo('Loading category budgets', {
          family_id: currentFamily.id
        }, 'finance', 'load_budgets');
      } catch (logErr) {
        console.warn('Info logging failed:', logErr);
      }

      // Load budgets with categories
      const { data: budgetsData, error: budgetsError } = await supabase
        .from('category_budgets')
        .select(`
          *,
          category:transaction_categories(*)
        `)
        .eq('family_id', currentFamily.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (budgetsError) {
        // If tables don't exist yet (relation does not exist), gracefully handle it
        if (budgetsError.code === '42P01' || budgetsError.message?.includes('does not exist')) {
          await logInfo('Budget tables not yet created, skipping budget load', {
            family_id: currentFamily.id,
            error: budgetsError.message
          }, 'finance', 'load_budgets');
          setBudgets([]);
          setBudgetSummaries([]);
          setAlerts([]);
          setLoading(false);
          return;
        }
        throw budgetsError;
      }

      // Load current period summaries
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      const currentQuarter = Math.ceil(currentMonth / 3);

      const { data: summariesData, error: summariesError } = await supabase
        .from('category_budget_summaries')
        .select(`
          *,
          budget:category_budgets(
            *,
            category:transaction_categories(*)
          )
        `)
        .eq('year', currentYear)
        .or(`month.eq.${currentMonth},quarter.eq.${currentQuarter}`)
        .order('updated_at', { ascending: false });

      if (summariesError) {
        // If tables don't exist yet (relation does not exist), gracefully handle it
        if (summariesError.code === '42P01' || summariesError.message?.includes('does not exist')) {
          setBudgetSummaries([]);
          setAlerts([]);
          setBudgets(budgetsData || []);
          setLoading(false);
          return;
        }
        throw summariesError;
      }

      // Process summaries with additional calculations
      const processedSummaries = summariesData?.map(summary => ({
        ...summary,
        percentage_used: summary.budgeted_amount > 0 
          ? Math.round((summary.spent_amount / (summary.budgeted_amount + (summary.rollover_amount || 0))) * 100)
          : 0,
        is_over_budget: (summary.spent_amount || 0) > (summary.budgeted_amount + (summary.rollover_amount || 0)),
        days_remaining: calculateDaysRemaining(summary.budget?.period || 'monthly', currentDate)
      })) || [];

      // Merge budgets with their current summaries
      const budgetsWithSummaries = budgetsData?.map(budget => ({
        ...budget,
        current_summary: processedSummaries.find(s => s.budget_id === budget.id)
      })) || [];

      // Generate alerts
      const budgetAlerts = generateBudgetAlerts(budgetsWithSummaries);

      setBudgets(budgetsWithSummaries);
      setBudgetSummaries(processedSummaries);
      setAlerts(budgetAlerts);

      try {
        await logInfo('Budgets loaded successfully', {
          family_id: currentFamily.id,
          budgets_count: budgetsData?.length || 0,
          summaries_count: summariesData?.length || 0,
          alerts_count: budgetAlerts.length
        }, 'finance', 'load_budgets');
      } catch (logErr) {
        console.warn('Info logging failed:', logErr);
      }

    } catch (error: any) {
      // Handle various error scenarios
      if (error.code === '42P01' || 
          error.message?.includes('does not exist') ||
          error.message?.includes('Failed to fetch') ||
          error.name === 'TypeError') {
        try {
          await logInfo('Budget tables not available, skipping budget functionality', {
            family_id: currentFamily.id,
            error: error.message
          }, 'finance', 'load_budgets');
        } catch (logErr) {
          console.warn('Info logging failed:', logErr);
        }
        setBudgets([]);
        setBudgetSummaries([]);
        setAlerts([]);
      } else {
        try {
          await logError('Failed to load budgets', error, 'finance', 'load_budgets', 'FETCH_ERROR');
        } catch (logErr) {
          console.warn('Error logging failed:', logErr);
        }
        throw error;
      }
    } finally {
      setLoading(false);
    }
  }, [currentFamily]);

  // Create new budget
  const createBudget = useCallback(async (budgetData: CreateBudgetData) => {
    if (!currentFamily || !user) {
      throw new Error('Missing family or user context');
    }

    try {
      try {
        await logInfo('Creating new budget', {
          family_id: currentFamily.id,
          category_id: budgetData.category_id,
          amount: budgetData.amount,
          period: budgetData.period
        }, 'finance', 'create_budget');
      } catch (logErr) {
        console.warn('Info logging failed:', logErr);
      }

      const sanitizedData: TablesInsert<'category_budgets'> = {
        family_id: currentFamily.id,
        category_id: budgetData.category_id,
        name: sanitizeText(budgetData.name),
        amount: budgetData.amount,
        period: budgetData.period,
        start_date: budgetData.start_date,
        end_date: budgetData.end_date || null,
        alert_threshold: budgetData.alert_threshold || 0.80,
        alert_enabled: budgetData.alert_enabled ?? true,
        rollover_enabled: budgetData.rollover_enabled || false,
        rollover_limit: budgetData.rollover_limit || null,
        created_by: user.id
      };

      const { data, error } = await supabase
        .from('category_budgets')
        .insert(sanitizedData)
        .select()
        .single();

      if (error) throw error;

      await logTransaction('category_budget_created', {
        budget_id: data.id,
        category_id: data.category_id,
        amount: data.amount,
        period: data.period
      });

      await loadBudgets();
      return data;

    } catch (error: any) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        throw new Error('Budget functionality is not available yet. Please contact your administrator to enable this feature.');
      }
      try {
        await logError('Failed to create budget', error, 'finance', 'create_budget', 'CREATE_ERROR');
      } catch (logErr) {
        console.warn('Error logging failed:', logErr);
      }
      throw error;
    }
  }, [currentFamily, user, loadBudgets, logTransaction]);

  // Update budget
  const updateBudget = useCallback(async (budgetId: string, updateData: UpdateBudgetData) => {
    if (!currentFamily || !user) {
      throw new Error('Missing family or user context');
    }

    try {
      try {
        await logInfo('Updating budget', {
          family_id: currentFamily.id,
          budget_id: budgetId,
          updates: Object.keys(updateData)
        }, 'finance', 'update_budget');
      } catch (logErr) {
        console.warn('Info logging failed:', logErr);
      }

      const sanitizedData: TablesUpdate<'category_budgets'> = {};
      
      if (updateData.name) sanitizedData.name = sanitizeText(updateData.name);
      if (updateData.amount !== undefined) sanitizedData.amount = updateData.amount;
      if (updateData.period) sanitizedData.period = updateData.period;
      if (updateData.start_date) sanitizedData.start_date = updateData.start_date;
      if (updateData.end_date !== undefined) sanitizedData.end_date = updateData.end_date;
      if (updateData.alert_threshold !== undefined) sanitizedData.alert_threshold = updateData.alert_threshold;
      if (updateData.alert_enabled !== undefined) sanitizedData.alert_enabled = updateData.alert_enabled;
      if (updateData.rollover_enabled !== undefined) sanitizedData.rollover_enabled = updateData.rollover_enabled;
      if (updateData.rollover_limit !== undefined) sanitizedData.rollover_limit = updateData.rollover_limit;
      if (updateData.is_active !== undefined) sanitizedData.is_active = updateData.is_active;

      const { data, error } = await supabase
        .from('category_budgets')
        .update(sanitizedData)
        .eq('id', budgetId)
        .eq('family_id', currentFamily.id)
        .select()
        .single();

      if (error) throw error;

      await logTransaction('category_budget_updated', {
        budget_id: budgetId,
        updates: Object.keys(sanitizedData)
      });

      await loadBudgets();
      return data;

    } catch (error: any) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        throw new Error('Budget functionality is not available yet. Please contact your administrator to enable this feature.');
      }
      try {
        await logError('Failed to update budget', error, 'finance', 'update_budget', 'UPDATE_ERROR');
      } catch (logErr) {
        console.warn('Error logging failed:', logErr);
      }
      throw error;
    }
  }, [currentFamily, user, loadBudgets, logTransaction]);

  // Delete budget
  const deleteBudget = useCallback(async (budgetId: string) => {
    if (!currentFamily || !user) {
      throw new Error('Missing family or user context');
    }

    try {
      try {
        await logInfo('Deleting budget', {
          family_id: currentFamily.id,
          budget_id: budgetId
        }, 'finance', 'delete_budget');
      } catch (logErr) {
        console.warn('Info logging failed:', logErr);
      }

      const { error } = await supabase
        .from('category_budgets')
        .delete()
        .eq('id', budgetId)
        .eq('family_id', currentFamily.id);

      if (error) throw error;

      await logTransaction('category_budget_deleted', {
        budget_id: budgetId
      });

      await loadBudgets();

    } catch (error: any) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        throw new Error('Budget functionality is not available yet. Please contact your administrator to enable this feature.');
      }
      try {
        await logError('Failed to delete budget', error, 'finance', 'delete_budget', 'DELETE_ERROR');
      } catch (logErr) {
        console.warn('Error logging failed:', logErr);
      }
      throw error;
    }
  }, [currentFamily, user, loadBudgets, logTransaction]);

  // Get budget summary for specific period
  const getBudgetSummary = useCallback(async (budgetId: string, year: number, month?: number, quarter?: number) => {
    try {
      const { data, error } = await supabase
        .from('category_budget_summaries')
        .select('*')
        .eq('budget_id', budgetId)
        .eq('year', year)
        .eq('month', month || null)
        .eq('quarter', quarter || null)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      return data;
    } catch (error: any) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return null; // Gracefully return null when tables don't exist
      }
      try {
        await logError('Failed to get budget summary', error, 'finance', 'get_budget_summary', 'FETCH_ERROR');
      } catch (logErr) {
        console.warn('Error logging failed:', logErr);
      }
      throw error;
    }
  }, []);

  // Load budgets on mount
  useEffect(() => {
    if (currentFamily) {
      loadBudgets();
    }
  }, [currentFamily, loadBudgets]);

  return {
    budgets,
    budgetSummaries,
    alerts,
    loading,
    loadBudgets,
    createBudget,
    updateBudget,
    deleteBudget,
    getBudgetSummary
  };
};

// Helper functions
function calculateDaysRemaining(period: string, currentDate: Date): number {
  const today = new Date(currentDate);
  
  switch (period) {
    case 'weekly': {
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
      return Math.ceil((endOfWeek.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }
    case 'monthly': {
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return Math.ceil((endOfMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }
    case 'quarterly': {
      const currentQuarter = Math.ceil((today.getMonth() + 1) / 3);
      const endOfQuarter = new Date(today.getFullYear(), currentQuarter * 3, 0);
      return Math.ceil((endOfQuarter.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }
    case 'yearly': {
      const endOfYear = new Date(today.getFullYear(), 11, 31);
      return Math.ceil((endOfYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }
    default:
      return 0;
  }
}

function generateBudgetAlerts(budgets: CategoryBudget[]): BudgetAlert[] {
  const alerts: BudgetAlert[] = [];

  budgets.forEach(budget => {
    if (!budget.alert_enabled || !budget.current_summary) return;

    const summary = budget.current_summary;
    const percentage = summary.percentage_used || 0;
    const threshold = (budget.alert_threshold || 0.80) * 100;

    if (percentage >= threshold) {
      alerts.push({
        budget_id: budget.id,
        category_name: budget.category?.name || 'Unknown',
        budget_name: budget.name,
        amount: budget.amount,
        spent: summary.spent_amount || 0,
        percentage,
        threshold,
        period: budget.period,
        severity: percentage >= 100 ? 'danger' : 'warning'
      });
    }
  });

  return alerts.sort((a, b) => b.percentage - a.percentage);
}