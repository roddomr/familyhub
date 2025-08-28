import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Target, MoreVertical, Edit, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { format, isWithinInterval, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, addDays } from 'date-fns';
import { useFamily } from '@/hooks/useFamily';
import { useLogger } from '@/hooks/useLogger';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { useEnhancedToast } from '@/hooks/useEnhancedToast';
import type { Budget, Transaction, TransactionCategory } from '@/hooks/useFinances';
import { CreateBudgetDialog } from './CreateBudgetDialog';
import { EditBudgetDialog } from './EditBudgetDialog';

interface BudgetWithCategory extends Budget {
  transaction_categories?: TransactionCategory | null;
}

interface BudgetListProps {
  budgets: BudgetWithCategory[];
  onBudgetChange: () => void;
  showCreateButton?: boolean;
  showHeader?: boolean;
}

export const BudgetList: React.FC<BudgetListProps> = ({
  budgets,
  onBudgetChange,
  showCreateButton = false,
  showHeader = false
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentFamily } = useFamily();
  const { logInfo, logError } = useLogger();
  const toast = useEnhancedToast();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<BudgetWithCategory | null>(null);

  // Load transactions for budget calculations
  useEffect(() => {
    if (currentFamily) {
      loadTransactions();
    }
  }, [currentFamily]);

  const loadTransactions = async () => {
    if (!currentFamily) return;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('family_id', currentFamily.id)
        .eq('type', 'expense');

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const getBudgetPeriodRange = (budget: Budget) => {
    const startDate = new Date(budget.start_date);
    const now = new Date();
    
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
          end: budget.end_date ? new Date(budget.end_date) : now
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

  const getBudgetProgress = (budget: Budget) => {
    const spent = getBudgetSpent(budget);
    const percentage = (spent / budget.amount) * 100;
    return {
      spent,
      percentage: Math.min(percentage, 100),
      remaining: budget.amount - spent,
      isOverBudget: spent > budget.amount,
      isNearAlert: percentage >= (budget.alert_threshold * 100)
    };
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

  const getStatusColor = (budget: Budget) => {
    const progress = getBudgetProgress(budget);
    
    if (progress.isOverBudget) return 'destructive';
    if (progress.isNearAlert) return 'warning';
    return 'success';
  };

  const getStatusIcon = (budget: Budget) => {
    const progress = getBudgetProgress(budget);
    
    if (progress.isOverBudget) return AlertTriangle;
    if (progress.isNearAlert) return AlertTriangle;
    return CheckCircle;
  };

  const handleEdit = (budget: BudgetWithCategory) => {
    setSelectedBudget(budget);
    setEditDialogOpen(true);
  };

  const handleDelete = (budget: BudgetWithCategory) => {
    setSelectedBudget(budget);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedBudget || !currentFamily) return;

    setLoading(true);
    try {
      await logInfo('Deleting budget', {
        family_id: currentFamily.id,
        budget_id: selectedBudget.id,
        budget_name: selectedBudget.name
      }, 'finance', 'budget-deletion');

      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', selectedBudget.id);

      if (error) throw error;

      await logInfo('Budget deleted successfully', {
        family_id: currentFamily.id,
        budget_name: selectedBudget.name
      }, 'finance', 'budget-deletion');

      toast.success({
        title: t('finance.budgetDeletedSuccessfully'),
        description: t('finance.budgetDeletedDescription', { name: selectedBudget.name })
      });

      setDeleteDialogOpen(false);
      setSelectedBudget(null);
      onBudgetChange();

    } catch (error: any) {
      console.error('Error deleting budget:', error);
      
      await logError('Failed to delete budget', error, {
        family_id: currentFamily?.id,
        budget_id: selectedBudget?.id
      }, 'finance', 'budget-deletion');

      toast.apiError(error, 'deleting budget');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        {showHeader && (
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{t('finance.budgets')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('finance.budgetsDescription')}
              </p>
            </div>
            {showCreateButton && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Target className="w-4 h-4 mr-2" />
                {t('finance.createBudget')}
              </Button>
            )}
          </div>
        )}

        {budgets.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {t('finance.noBudgetsYet')}
              </p>
              {showCreateButton && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  {t('finance.createFirstBudget')}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {budgets.map((budget) => {
              const progress = getBudgetProgress(budget);
              const StatusIcon = getStatusIcon(budget);
              const statusColor = getStatusColor(budget);
              
              return (
                <Card key={budget.id} className="relative">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-brand-primary" />
                        <CardTitle className="text-base">{budget.name}</CardTitle>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(budget)}>
                            <Edit className="w-4 h-4 mr-2" />
                            {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(budget)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t('common.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <CardDescription className="flex items-center gap-2">
                      {budget.transaction_categories ? (
                        <>
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: budget.transaction_categories.color }}
                          />
                          {budget.transaction_categories.name}
                        </>
                      ) : (
                        t('finance.allCategories')
                      )}
                      <span className="text-xs">•</span>
                      <span className="text-xs">{getPeriodLabel(budget.period)}</span>
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold">
                          ${progress.spent.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('finance.of')} ${budget.amount.toFixed(2)}
                        </p>
                      </div>
                      <Badge variant={statusColor} className="flex items-center gap-1">
                        <StatusIcon className="w-3 h-3" />
                        {progress.percentage.toFixed(0)}%
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <Progress 
                        value={progress.percentage} 
                        className={`h-2 ${progress.isOverBudget ? 'progress-destructive' : ''}`}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {progress.remaining >= 0 
                            ? t('finance.remaining', { amount: progress.remaining.toFixed(2) })
                            : t('finance.overBudget', { amount: Math.abs(progress.remaining).toFixed(2) })
                          }
                        </span>
                        <span>
                          {format(new Date(budget.start_date), 'MMM dd')} - {format(new Date(budget.end_date || budget.start_date), 'MMM dd')}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {showCreateButton && (
        <CreateBudgetDialog 
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onBudgetCreated={onBudgetChange}
        />
      )}

      {selectedBudget && (
        <EditBudgetDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          budget={selectedBudget}
          onBudgetUpdated={onBudgetChange}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('finance.deleteBudget')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('finance.deleteBudgetConfirmation', { name: selectedBudget?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? t('common.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BudgetList;