import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import BudgetList from '@/components/finance/BudgetList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Target, 
  ArrowLeft, 
  Filter,
  SortAsc,
  SortDesc,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFinances } from '@/hooks/useFinances';
import { useFamily } from '@/hooks/useFamily';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { Budget } from '@/hooks/useFinances';

interface BudgetWithCategory extends Budget {
  transaction_categories?: {
    name: string;
    color: string;
    icon: string;
  } | null;
}

const BudgetView = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { budgets, loading, refreshData } = useFinances();
  const { currentFamily } = useFamily();
  
  const [sortBy, setSortBy] = useState<'name' | 'amount' | 'progress' | 'created'>('created');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterBy, setFilterBy] = useState<'all' | 'active' | 'over' | 'near'>('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'weekly' | 'bi-weekly' | 'fortnightly' | 'monthly' | 'yearly'>('all');

  // Mock function to calculate budget progress - would be moved to a hook
  const getBudgetProgress = (budget: Budget) => {
    // This would use actual transaction data
    const mockSpent = Math.random() * budget.amount * 1.2; // Random for demo
    const percentage = (mockSpent / budget.amount) * 100;
    return {
      spent: mockSpent,
      percentage: Math.min(percentage, 100),
      remaining: budget.amount - mockSpent,
      isOverBudget: mockSpent > budget.amount,
      isNearAlert: percentage >= (budget.alert_threshold * 100)
    };
  };

  // Filter and sort budgets
  const filteredAndSortedBudgets = React.useMemo(() => {
    let filtered = budgets.filter(budget => {
      // Period filter
      if (periodFilter !== 'all' && budget.period !== periodFilter) {
        return false;
      }

      // Status filter
      if (filterBy !== 'all') {
        const progress = getBudgetProgress(budget);
        switch (filterBy) {
          case 'active':
            return budget.is_active;
          case 'over':
            return progress.isOverBudget;
          case 'near':
            return progress.isNearAlert && !progress.isOverBudget;
        }
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'progress':
          const progressA = getBudgetProgress(a).percentage;
          const progressB = getBudgetProgress(b).percentage;
          comparison = progressA - progressB;
          break;
        case 'created':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [budgets, sortBy, sortDirection, filterBy, periodFilter]);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const getFilterStats = () => {
    const total = budgets.length;
    const active = budgets.filter(b => b.is_active).length;
    const over = budgets.filter(b => getBudgetProgress(b).isOverBudget).length;
    const near = budgets.filter(b => {
      const progress = getBudgetProgress(b);
      return progress.isNearAlert && !progress.isOverBudget;
    }).length;

    return { total, active, over, near };
  };

  const stats = getFilterStats();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t('finance.loadingBudgets')}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!currentFamily) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t('finance.noFamilySelected')}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/finances')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('common.back')}
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Target className="w-8 h-8 text-brand-primary" />
                {t('finance.budgets')}
              </h1>
              <p className="text-muted-foreground">
                {t('finance.manageBudgetsDescription')}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('finance.totalBudgets')}</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Target className="w-8 h-8 text-brand-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('finance.activeBudgets')}</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('finance.nearThreshold')}</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.near}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('finance.overBudget')}</p>
                  <p className="text-2xl font-bold text-red-600">{stats.over}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Sorting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              {t('finance.filtersAndSorting')}
            </CardTitle>
            <CardDescription>
              {t('finance.customizeYourBudgetView')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('finance.status')}</label>
                <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('finance.allBudgets')}</SelectItem>
                    <SelectItem value="active">{t('finance.activeOnly')}</SelectItem>
                    <SelectItem value="near">{t('finance.nearThresholdOnly')}</SelectItem>
                    <SelectItem value="over">{t('finance.overBudgetOnly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Period Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('finance.period')}</label>
                <Select value={periodFilter} onValueChange={(value: any) => setPeriodFilter(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('finance.allPeriods')}</SelectItem>
                    <SelectItem value="weekly">{t('finance.weekly')}</SelectItem>
                    <SelectItem value="bi-weekly">{t('finance.biWeekly')}</SelectItem>
                    <SelectItem value="fortnightly">{t('finance.fortnightly')}</SelectItem>
                    <SelectItem value="monthly">{t('finance.monthly')}</SelectItem>
                    <SelectItem value="yearly">{t('finance.yearly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort By */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('finance.sortBy')}</label>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created">{t('finance.dateCreated')}</SelectItem>
                    <SelectItem value="name">{t('finance.name')}</SelectItem>
                    <SelectItem value="amount">{t('finance.amount')}</SelectItem>
                    <SelectItem value="progress">{t('finance.progress')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Direction */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('finance.sortDirection')}</label>
                <Button
                  variant="outline"
                  onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                  className="w-full justify-center"
                >
                  {sortDirection === 'asc' ? (
                    <>
                      <SortAsc className="w-4 h-4 mr-2" />
                      {t('finance.ascending')}
                    </>
                  ) : (
                    <>
                      <SortDesc className="w-4 h-4 mr-2" />
                      {t('finance.descending')}
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <span>{t('finance.showing')} {filteredAndSortedBudgets.length} {t('finance.of')} {budgets.length} {t('finance.budgets').toLowerCase()}</span>
              {filterBy !== 'all' && (
                <Badge variant="outline">
                  {filterBy === 'active' && t('finance.activeOnly')}
                  {filterBy === 'near' && t('finance.nearThresholdOnly')}
                  {filterBy === 'over' && t('finance.overBudgetOnly')}
                </Badge>
              )}
              {periodFilter !== 'all' && (
                <Badge variant="outline">
                  {periodFilter === 'weekly' && t('finance.weekly')}
                  {periodFilter === 'bi-weekly' && t('finance.biWeekly')}
                  {periodFilter === 'fortnightly' && t('finance.fortnightly')}
                  {periodFilter === 'monthly' && t('finance.monthly')}
                  {periodFilter === 'yearly' && t('finance.yearly')}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Budget List */}
        <BudgetList 
          budgets={filteredAndSortedBudgets}
          onBudgetChange={refreshData}
          showCreateButton={true}
          showHeader={true}
        />

        {filteredAndSortedBudgets.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {filterBy === 'all' ? 
                  t('finance.noBudgetsYet') : 
                  t('finance.noBudgetsMatchFilter')
                }
              </p>
              {filterBy !== 'all' && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setFilterBy('all');
                    setPeriodFilter('all');
                  }}
                >
                  {t('finance.clearFilters')}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default BudgetView;