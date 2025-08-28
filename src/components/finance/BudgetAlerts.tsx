import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Bell, X, Target, TrendingUp } from 'lucide-react';
import { useFamily } from '@/hooks/useFamily';
import { useLogger } from '@/hooks/useLogger';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { useEnhancedToast } from '@/hooks/useEnhancedToast';
import { cn } from '@/lib/utils';
import { format, isWithinInterval, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, addDays } from 'date-fns';
import type { Budget, Transaction } from '@/hooks/useFinances';

interface BudgetWithCategory extends Budget {
  transaction_categories?: {
    name: string;
    color: string;
    icon: string;
  } | null;
}

interface BudgetAlertData {
  budget: BudgetWithCategory;
  spent: number;
  percentage: number;
  isOverBudget: boolean;
  isNearAlert: boolean;
  remaining: number;
}

interface BudgetAlertsProps {
  budgets: BudgetWithCategory[];
  className?: string;
}

export const BudgetAlerts: React.FC<BudgetAlertsProps> = ({
  budgets,
  className
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentFamily } = useFamily();
  const { logInfo, logError } = useLogger();
  const toast = useEnhancedToast();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Load transactions for budget calculations
  useEffect(() => {
    if (currentFamily) {
      loadTransactions();
    }
  }, [currentFamily]);

  const loadTransactions = async () => {
    if (!currentFamily) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('family_id', currentFamily.id)
        .eq('type', 'expense')
        .order('date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions for budget alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBudgetPeriodRange = (budget: Budget) => {
    const startDate = new Date(budget.start_date);
    
    switch (budget.period) {
      case 'weekly':
        return {
          start: startOfWeek(startDate),
          end: addDays(startOfWeek(startDate), 6)
        };
      case 'bi-weekly':
        return {
          start: startDate,
          end: addDays(startDate, 14) // Quincenal - 15 días
        };
      case 'fortnightly':
        return {
          start: startDate,
          end: addDays(startDate, 13) // Catorcenal - 14 días
        };
      case 'monthly':
        return {
          start: startOfMonth(startDate),
          end: endOfMonth(startDate)
        };
      case 'yearly':
        return {
          start: startOfYear(startDate),
          end: endOfYear(startDate)
        };
      default:
        return {
          start: startDate,
          end: budget.end_date ? new Date(budget.end_date) : new Date()
        };
    }
  };

  const getBudgetSpent = (budget: Budget) => {
    const { start, end } = getBudgetPeriodRange(budget);
    
    return transactions
      .filter(transaction => {
        const transactionDate = new Date(transaction.date);
        const isInPeriod = isWithinInterval(transactionDate, { start, end });
        
        // If budget has specific category, filter by it
        if (budget.category_id) {
          return isInPeriod && transaction.category_id === budget.category_id;
        }
        
        // If budget is for all categories, include all expenses
        return isInPeriod;
      })
      .reduce((sum, transaction) => sum + transaction.amount, 0);
  };

  const getBudgetAlerts = (): BudgetAlertData[] => {
    return budgets
      .filter(budget => budget.is_active)
      .map(budget => {
        const spent = getBudgetSpent(budget);
        const percentage = (spent / budget.amount) * 100;
        const isOverBudget = spent > budget.amount;
        const isNearAlert = percentage >= (budget.alert_threshold * 100);
        
        return {
          budget,
          spent,
          percentage,
          isOverBudget,
          isNearAlert,
          remaining: budget.amount - spent
        };
      })
      .filter(alert => (alert.isOverBudget || alert.isNearAlert) && !dismissedAlerts.has(alert.budget.id))
      .sort((a, b) => {
        // Sort by severity: over budget first, then by percentage
        if (a.isOverBudget && !b.isOverBudget) return -1;
        if (!a.isOverBudget && b.isOverBudget) return 1;
        return b.percentage - a.percentage;
      });
  };

  const dismissAlert = async (budgetId: string) => {
    setDismissedAlerts(prev => new Set([...prev, budgetId]));
    
    try {
      await logInfo('Budget alert dismissed', {
        family_id: currentFamily?.id,
        budget_id: budgetId
      }, 'finance', 'budget-alert');
    } catch (error) {
      console.error('Error logging alert dismissal:', error);
    }
  };

  const getAlertVariant = (alert: BudgetAlertData) => {
    if (alert.isOverBudget) return 'destructive';
    return 'default'; // Near threshold
  };

  const getAlertIcon = (alert: BudgetAlertData) => {
    if (alert.isOverBudget) return AlertTriangle;
    return Bell;
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'weekly': return t('finance.weekly');
      case 'bi-weekly': return t('finance.biWeekly');
      case 'fortnightly': return t('finance.fortnightly');
      case 'monthly': return t('finance.monthly');
      case 'yearly': return t('finance.yearly');
      default: return period;
    }
  };

  const budgetAlerts = getBudgetAlerts();

  if (loading || budgetAlerts.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-orange-500" />
        <h3 className="text-lg font-semibold">{t('finance.budgetAlerts')}</h3>
        <Badge variant="secondary">{budgetAlerts.length}</Badge>
      </div>

      <div className="space-y-3">
        {budgetAlerts.map((alert) => {
          const AlertIcon = getAlertIcon(alert);
          
          return (
            <Alert key={alert.budget.id} variant={getAlertVariant(alert)}>
              <AlertIcon className="h-4 w-4" />
              <div className="flex items-start justify-between w-full">
                <div className="flex-1">
                  <AlertTitle className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    {alert.budget.name}
                    <Badge variant="outline" className="text-xs">
                      {getPeriodLabel(alert.budget.period)}
                    </Badge>
                    {alert.budget.transaction_categories && (
                      <div className="flex items-center gap-1">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: alert.budget.transaction_categories.color }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {alert.budget.transaction_categories.name}
                        </span>
                      </div>
                    )}
                  </AlertTitle>
                  <AlertDescription className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>
                        {alert.isOverBudget ? (
                          <>
                            <TrendingUp className="w-3 h-3 inline mr-1" />
                            {t('finance.budgetExceeded')}
                          </>
                        ) : (
                          <>
                            <Bell className="w-3 h-3 inline mr-1" />
                            {t('finance.budgetNearThreshold')}
                          </>
                        )}
                      </span>
                      <Badge variant={alert.isOverBudget ? "destructive" : "secondary"}>
                        {alert.percentage.toFixed(0)}%
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">${alert.spent.toFixed(2)}</span> {t('finance.spent')} {t('finance.of')} <span className="font-medium">${alert.budget.amount.toFixed(2)}</span>
                      {alert.isOverBudget ? (
                        <span className="text-red-600 ml-2">
                          (${Math.abs(alert.remaining).toFixed(2)} {t('finance.over')})
                        </span>
                      ) : (
                        <span className="ml-2">
                          (${alert.remaining.toFixed(2)} {t('finance.remaining')})
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('finance.alertThreshold')}: {(alert.budget.alert_threshold * 100).toFixed(0)}%
                    </div>
                  </AlertDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 h-6 w-6 p-0"
                  onClick={() => dismissAlert(alert.budget.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Alert>
          );
        })}
      </div>

      {budgetAlerts.length > 0 && (
        <div className="text-xs text-muted-foreground border-t pt-2">
          <p>{t('finance.budgetAlertsDescription')}</p>
        </div>
      )}
    </div>
  );
};

export default BudgetAlerts;