import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Download,
  RefreshCw,
  Settings,
  PieChart,
  LineChart,
  Users,
  Target,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useFamily } from '@/hooks/useFamily';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { DateRange } from '@/types/analytics';
import { LoadingSpinner } from '@/components/ui/loading-states';
import { CardSkeleton } from '@/components/ui/skeleton-loader';
import { 
  IncomeExpenseBarChart, 
  CategoryPieChart, 
  TrendLineChart, 
  BudgetProgressChart,
  MetricCard 
} from '@/components/analytics/charts/ChartComponents';
import { SpendingAnalysis } from '@/components/analytics/SpendingAnalysis';
import { ExportDialog } from '@/components/analytics/ExportDialog';
import { FamilyInsights } from '@/components/analytics/FamilyInsights';
import { BudgetRecommendations } from '@/components/analytics/BudgetRecommendations';

const Analytics = () => {
  const { t } = useTranslation();
  const { currentFamily } = useFamily();
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>('last_30_days');
  const [activeTab, setActiveTab] = useState('overview');

  const {
    loading,
    error,
    dashboardData,
    preferences,
    insights,
    transactions,
    fetchDashboardData,
    calculateInsights,
    trackActivity
  } = useAnalytics({ 
    dateRange: selectedDateRange,
    autoFetch: true 
  });

  // Handle date range change
  const handleDateRangeChange = async (range: DateRange) => {
    setSelectedDateRange(range);
    await fetchDashboardData(range);
    await trackActivity('analytics_view');
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(preferences?.number_format || 'en-US', {
      style: 'currency',
      currency: preferences?.currency_display || 'USD'
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  if (!currentFamily) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('analytics.noFamilySelected')}</h3>
            <p className="text-muted-foreground">{t('analytics.selectFamily')}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('analytics.errorLoading')}</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => fetchDashboardData(selectedDateRange)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('analytics.retry')}
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BarChart3 className="w-8 h-8 text-brand-primary" />
            <div>
              <h1 className="text-3xl font-bold">{t('analytics.title')}</h1>
              <p className="text-text-secondary mt-1">
                {t('analytics.subtitle')} {currentFamily.name}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Date Range Selector */}
            <Select value={selectedDateRange} onValueChange={(value: DateRange) => handleDateRangeChange(value)}>
              <SelectTrigger className="w-48">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last_7_days">{t('analytics.dateRanges.last7Days')}</SelectItem>
                <SelectItem value="last_30_days">{t('analytics.dateRanges.last30Days')}</SelectItem>
                <SelectItem value="last_90_days">{t('analytics.dateRanges.last90Days')}</SelectItem>
                <SelectItem value="current_month">{t('analytics.dateRanges.thisMonth')}</SelectItem>
                <SelectItem value="current_year">{t('analytics.dateRanges.thisYear')}</SelectItem>
                <SelectItem value="last_year">{t('analytics.dateRanges.lastYear')}</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => calculateInsights(selectedDateRange)}>
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
              {t('analytics.refresh')}
            </Button>
            
            {dashboardData && (
              <ExportDialog
                dashboardData={dashboardData}
                transactions={transactions || []}
                dateRange={selectedDateRange}
              />
            )}
            
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              {t('analytics.settings')}
            </Button>
          </div>
        </div>

        {loading && !dashboardData ? (
          <div className="space-y-6">
            <CardSkeleton className="h-32" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <CardSkeleton className="h-24" />
              <CardSkeleton className="h-24" />
              <CardSkeleton className="h-24" />
              <CardSkeleton className="h-24" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CardSkeleton className="h-64" />
              <CardSkeleton className="h-64" />
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="overview">{t('analytics.overview')}</TabsTrigger>
              <TabsTrigger value="spending">{t('analytics.spending')}</TabsTrigger>
              <TabsTrigger value="family">Family Insights</TabsTrigger>
              <TabsTrigger value="budget-recommendations">Budget AI</TabsTrigger>
              <TabsTrigger value="budgets">{t('analytics.budgets')}</TabsTrigger>
              <TabsTrigger value="insights">{t('analytics.insights')}</TabsTrigger>
              <TabsTrigger value="reports">{t('analytics.reports')}</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {dashboardData && (
                <>
                  {/* Financial Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">{t('analytics.totalIncome')}</p>
                            <p className="text-2xl font-bold text-green-600">
                              {formatCurrency(dashboardData.financial_summary.total_income)}
                            </p>
                          </div>
                          <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-full">
                            <TrendingUp className="w-6 h-6 text-green-600" />
                          </div>
                        </div>
                        <div className="mt-2 flex items-center text-sm">
                          <span className={cn(
                            "font-medium",
                            dashboardData.financial_summary.previous_period_comparison.income_change >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          )}>
                            {formatPercentage(dashboardData.financial_summary.previous_period_comparison.income_change)}
                          </span>
                          <span className="text-muted-foreground ml-1">{t('analytics.vsLastPeriod')}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">{t('analytics.totalExpenses')}</p>
                            <p className="text-2xl font-bold text-red-600">
                              {formatCurrency(dashboardData.financial_summary.total_expenses)}
                            </p>
                          </div>
                          <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full">
                            <TrendingDown className="w-6 h-6 text-red-600" />
                          </div>
                        </div>
                        <div className="mt-2 flex items-center text-sm">
                          <span className={cn(
                            "font-medium",
                            dashboardData.financial_summary.previous_period_comparison.expense_change <= 0
                              ? "text-green-600"
                              : "text-red-600"
                          )}>
                            {formatPercentage(dashboardData.financial_summary.previous_period_comparison.expense_change)}
                          </span>
                          <span className="text-muted-foreground ml-1">{t('analytics.vsLastPeriod')}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">{t('analytics.netIncome')}</p>
                            <p className={cn(
                              "text-2xl font-bold",
                              dashboardData.financial_summary.net_income >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            )}>
                              {formatCurrency(dashboardData.financial_summary.net_income)}
                            </p>
                          </div>
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                            <DollarSign className="w-6 h-6 text-blue-600" />
                          </div>
                        </div>
                        <div className="mt-2 flex items-center text-sm">
                          <span className="text-muted-foreground">
                            {formatPercentage(dashboardData.quick_stats.savings_rate)} {t('analytics.savingsRate')}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">{t('analytics.transactions')}</p>
                            <p className="text-2xl font-bold">
                              {dashboardData.quick_stats.transactions_this_month}
                            </p>
                          </div>
                          <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                            <BarChart3 className="w-6 h-6 text-purple-600" />
                          </div>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-muted-foreground">
                          {dashboardData.quick_stats.spending_velocity.toFixed(1)} {t('analytics.perDay')}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Charts Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Income vs Expenses Chart */}
                    <IncomeExpenseBarChart
                      data={dashboardData.recent_trends}
                      height={350}
                    />

                    {/* Top Categories */}
                    <CategoryPieChart
                      data={dashboardData.top_categories.expenses}
                      title="Top Expense Categories"
                      description="Breakdown by spending category"
                      height={350}
                    />
                  </div>

                  {/* Additional Charts Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Trend Line Chart */}
                    <TrendLineChart
                      data={dashboardData.recent_trends}
                      title="Net Income Trend"
                      description="Daily net income (income - expenses)"
                      height={300}
                    />

                    {/* Budget Progress */}
                    <BudgetProgressChart
                      budgets={dashboardData.budget_status.map((budget, index) => ({
                        name: `Budget ${index + 1}`,
                        budgeted: budget.budgeted,
                        spent: budget.spent,
                        category: 'General'
                      }))}
                    />
                  </div>

                  {/* Account Balances */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        Account Balances
                      </CardTitle>
                      <CardDescription>Current balances across all accounts</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {dashboardData.account_balances.map((account, index) => (
                          <div key={index} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{account.label}</span>
                              <span className={cn(
                                "font-semibold",
                                account.value >= 0 ? "text-green-600" : "text-red-600"
                              )}>
                                {formatCurrency(account.value)}
                              </span>
                            </div>
                          </div>
                        ))}
                        {dashboardData.account_balances.length === 0 && (
                          <div className="col-span-full h-24 flex items-center justify-center">
                            <p className="text-muted-foreground">No accounts found</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="spending">
              <SpendingAnalysis
                dateRange={selectedDateRange}
                loading={loading}
              />
            </TabsContent>

            <TabsContent value="family">
              <FamilyInsights
                dateRange={selectedDateRange}
              />
            </TabsContent>

            {/* Budget Recommendations Tab */}
            <TabsContent value="budget-recommendations">
              <BudgetRecommendations
                dateRange={selectedDateRange}
              />
            </TabsContent>

            <TabsContent value="budgets">
              <Card>
                <CardHeader>
                  <CardTitle>{t('analytics.budgets')} {t('common.comingSoon')}</CardTitle>
                  <CardDescription>Track budget performance and spending against goals</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-96 flex items-center justify-center">
                    <div className="text-center">
                      <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">{t('common.comingSoon')}</h3>
                      <p className="text-muted-foreground">
                        {t('analytics.comingSoon.budgetAnalysis')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="insights">
              <Card>
                <CardHeader>
                  <CardTitle>{t('analytics.insights')} {t('common.comingSoon')}</CardTitle>
                  <CardDescription>Smart recommendations and financial insights</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-96 flex items-center justify-center">
                    <div className="text-center">
                      <Lightbulb className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">{t('common.comingSoon')}</h3>
                      <p className="text-muted-foreground">
                        {t('analytics.comingSoon.aiInsights')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports">
              <Card>
                <CardHeader>
                  <CardTitle>{t('analytics.reports')} {t('common.comingSoon')}</CardTitle>
                  <CardDescription>Create and manage custom financial reports</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-96 flex items-center justify-center">
                    <div className="text-center">
                      <Download className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">{t('common.comingSoon')}</h3>
                      <p className="text-muted-foreground">
                        {t('analytics.comingSoon.customReports')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Analytics;