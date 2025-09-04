import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  DollarSign, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  MoreVertical,
  Edit,
  Trash,
  Calendar,
  Target,
  Plus
} from 'lucide-react';
import { useCategoryBudgets, type CategoryBudget, type BudgetAlert } from '@/hooks/useCategoryBudgets';
import { useTranslation } from 'react-i18next';
import { useEnhancedToast } from '@/hooks/useEnhancedToast';
import { CategoryBudgetDialog } from './CategoryBudgetDialog';
import { format, addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { cn } from '@/lib/utils';

interface CategoryBudgetOverviewProps {
  className?: string;
}

export const CategoryBudgetOverview = ({ className }: CategoryBudgetOverviewProps) => {
  const { t } = useTranslation();
  const toast = useEnhancedToast();
  const { budgets, alerts, loading, deleteBudget } = useCategoryBudgets();
  
  const [selectedBudget, setSelectedBudget] = useState<CategoryBudget | null>(null);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);

  const handleEditBudget = (budget: CategoryBudget) => {
    setSelectedBudget(budget);
    setBudgetDialogOpen(true);
  };

  const handleDeleteBudget = async (budget: CategoryBudget) => {
    try {
      await deleteBudget(budget.id);
      toast.success(t('finance.budgets.deleted'));
    } catch (error) {
      toast.error(t('finance.budgets.deleteError'));
    }
  };

  const getNextPeriodDate = (budget: CategoryBudget): string => {
    const startDate = new Date(budget.start_date);
    
    switch (budget.period) {
      case 'weekly':
        return format(addWeeks(startDate, 1), 'PPP');
      case 'monthly':
        return format(addMonths(startDate, 1), 'PPP');
      case 'quarterly':
        return format(addMonths(startDate, 3), 'PPP');
      case 'yearly':
        return format(addYears(startDate, 1), 'PPP');
      default:
        return '';
    }
  };

  const getSeverityColor = (severity: 'warning' | 'danger') => {
    switch (severity) {
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'danger':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const BudgetCard = ({ budget }: { budget: CategoryBudget }) => {
    const summary = budget.current_summary;
    const percentage = summary?.percentage_used || 0;
    const isOverBudget = summary?.is_over_budget || false;
    const daysRemaining = summary?.days_remaining || 0;

    return (
      <Card className="relative">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {budget.category && (
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: budget.category.color }}
                />
              )}
              <CardTitle className="text-base">{budget.name}</CardTitle>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="p-1 h-6 w-6">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEditBudget(budget)}>
                  <Edit className="h-4 w-4 mr-2" />
                  {t('common.edit')}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleDeleteBudget(budget)}
                  className="text-destructive"
                >
                  <Trash className="h-4 w-4 mr-2" />
                  {t('common.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CardDescription>
            {budget.category?.name} • {t(`finance.periods.${budget.period}`)}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* Budget Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{t('finance.budgets.spent')}</span>
              <span className={cn(
                "font-medium",
                isOverBudget ? "text-red-600" : "text-foreground"
              )}>
                ${summary?.spent_amount?.toLocaleString() || '0.00'} / ${budget.amount.toLocaleString()}
              </span>
            </div>
            <Progress
              value={Math.min(percentage, 100)}
              className={cn(
                "h-2",
                isOverBudget && "bg-red-100"
              )}
              indicatorClassName={cn(
                isOverBudget ? "bg-red-600" : 
                percentage >= (budget.alert_threshold || 80) * 100 ? "bg-yellow-500" : "bg-green-500"
              )}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{percentage.toFixed(1)}% used</span>
              {daysRemaining > 0 && (
                <span>{daysRemaining} days remaining</span>
              )}
            </div>
          </div>

          {/* Rollover Amount */}
          {budget.rollover_enabled && summary?.rollover_amount && (
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">Rollover:</span>
              <span className="font-medium text-green-600">
                +${summary.rollover_amount.toLocaleString()}
              </span>
            </div>
          )}

          {/* Status Badges */}
          <div className="flex gap-2">
            <Badge variant={isOverBudget ? "destructive" : "secondary"}>
              {isOverBudget ? t('finance.budgets.overBudget') : t('finance.budgets.onTrack')}
            </Badge>
            {budget.alert_enabled && (
              <Badge variant="outline">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {t('finance.budgets.alertsOn')}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">
            {t('finance.budgets.alerts')}
          </h3>
          <div className="space-y-2">
            {alerts.map(alert => (
              <div
                key={alert.budget_id}
                className={cn(
                  "p-3 rounded-lg border flex items-center justify-between",
                  getSeverityColor(alert.severity)
                )}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4" />
                  <div>
                    <div className="font-medium text-sm">{alert.category_name}</div>
                    <div className="text-xs opacity-75">
                      {alert.percentage.toFixed(1)}% of ${alert.amount.toLocaleString()} budget used
                    </div>
                  </div>
                </div>
                <Badge variant={alert.severity === 'danger' ? 'destructive' : 'outline'}>
                  {alert.percentage.toFixed(1)}%
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Budgets Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">
            {t('finance.budgets.categoryBudgets')}
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setBudgetDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('finance.budgets.create')}
          </Button>
        </div>

        {budgets.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-medium mb-2">{t('finance.budgets.noBudgets')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('finance.budgets.createFirstBudget')}
              </p>
              <Button onClick={() => setBudgetDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('finance.budgets.create')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {budgets.map(budget => (
              <BudgetCard key={budget.id} budget={budget} />
            ))}
          </div>
        )}
      </div>

      {/* Budget Dialog */}
      {selectedBudget && (
        <CategoryBudgetDialog
          open={budgetDialogOpen}
          onOpenChange={setBudgetDialogOpen}
          category={selectedBudget.category!}
          existingBudget={selectedBudget}
          onClose={() => {
            setSelectedBudget(null);
          }}
        />
      )}
      
      {!selectedBudget && (
        <CategoryBudgetDialog
          open={budgetDialogOpen}
          onOpenChange={setBudgetDialogOpen}
          category={{} as any} // Will be selected in dialog
          onClose={() => {}}
        />
      )}
    </div>
  );
};