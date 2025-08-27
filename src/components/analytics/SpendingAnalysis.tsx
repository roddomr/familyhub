import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFamily } from '@/hooks/useFamily';
import { supabase } from '@/lib/supabase';
import { useLogger } from '@/hooks/useLogger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CategoryPieChart,
  TrendLineChart,
  IncomeExpenseBarChart,
  MetricCard
} from './charts/ChartComponents';
import { LoadingSpinner, EmptyState } from '@/components/ui/loading-states';
import { ExportDialog } from './ExportDialog';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  PieChart,
  Target,
  ArrowUpDown,
  Filter,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimeSeriesDataPoint, ChartDataPoint, DateRange } from '@/types/analytics';

interface Transaction {
  id: string;
  amount: number;
  description: string;
  date: string;
  type: 'income' | 'expense';
  transaction_categories?: {
    name: string;
    color: string;
  };
  financial_accounts?: {
    name: string;
  };
  created_by?: string;
}

interface SpendingAnalysisProps {
  transactions?: Transaction[];
  dateRange: DateRange;
  loading?: boolean;
  className?: string;
}

interface CategoryAnalysis {
  name: string;
  total: number;
  percentage: number;
  transactionCount: number;
  averageAmount: number;
  trend: number;
  color: string;
  monthlyAverage: number;
  budgetVsActual?: {
    budgeted: number;
    actual: number;
    variance: number;
  };
}

interface SpendingPattern {
  dailyAverage: number;
  weeklyDistribution: number[];
  monthlyTrend: number;
  topSpendingDays: Array<{
    date: string;
    amount: number;
  }>;
}

export const SpendingAnalysis: React.FC<SpendingAnalysisProps> = ({
  transactions: propTransactions,
  dateRange,
  loading: externalLoading = false,
  className
}) => {
  const { t } = useTranslation();
  const { currentFamily } = useFamily();
  const { logInfo, logError } = useLogger();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [analysisView, setAnalysisView] = useState<'overview' | 'categories' | 'trends' | 'patterns'>('overview');
  const [sortBy, setSortBy] = useState<'amount' | 'count' | 'trend'>('amount');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to get date range boundaries
  const getDateRangeBoundaries = (range: DateRange) => {
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
  };

  // Fetch transactions if not provided via props
  useEffect(() => {
    if (propTransactions) {
      setTransactions(propTransactions);
      return;
    }

    if (!currentFamily) return;

    const fetchTransactions = async () => {
      setLoading(true);
      setError(null);

      try {
        const { start, end } = getDateRangeBoundaries(dateRange);
        

        await logInfo('Fetching transactions for spending analysis', {
          family_id: currentFamily.id,
          date_range: dateRange,
          start,
          end
        }, 'analytics', 'spending');

        const { data, error } = await supabase
          .from('transactions')
          .select(`
            *,
            transaction_categories(name, color),
            financial_accounts(name)
          `)
          .eq('family_id', currentFamily.id)
          .gte('date', start)
          .lte('date', end)
          .order('date', { ascending: false });

        if (error) throw error;


        setTransactions(data || []);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        await logError('Failed to fetch transactions for spending analysis', err as Error, {
          family_id: currentFamily.id,
          date_range: dateRange
        }, 'analytics', 'spending');
        setError(t('analytics.errorLoading'));
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [propTransactions, currentFamily, dateRange, t]);

  // Process transactions into spending analysis data
  const spendingData = useMemo(() => {
    if (!transactions?.length) return null;

    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Category analysis
    const categoryMap = new Map<string, CategoryAnalysis>();
    
    expenseTransactions.forEach(transaction => {
      const categoryName = transaction.transaction_categories?.name || 'Uncategorized';
      const categoryColor = transaction.transaction_categories?.color || '#6B7280';
      const amount = Math.abs(transaction.amount);
      
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, {
          name: categoryName,
          total: 0,
          percentage: 0,
          transactionCount: 0,
          averageAmount: 0,
          trend: 0,
          color: categoryColor,
          monthlyAverage: 0
        });
      }
      
      const category = categoryMap.get(categoryName)!;
      category.total += amount;
      category.transactionCount += 1;
    });

    // Calculate percentages and averages
    const categories = Array.from(categoryMap.values()).map(category => ({
      ...category,
      percentage: (category.total / totalExpenses) * 100,
      averageAmount: category.total / category.transactionCount,
      monthlyAverage: category.total / 1 // Simplified - could be more sophisticated
    }));

    // Sort categories
    categories.sort((a, b) => {
      switch (sortBy) {
        case 'count':
          return b.transactionCount - a.transactionCount;
        case 'trend':
          return b.trend - a.trend;
        default:
          return b.total - a.total;
      }
    });

    // Time series data for trends
    const dailySpending = new Map<string, number>();
    expenseTransactions.forEach(transaction => {
      const date = transaction.date.split('T')[0];
      const amount = Math.abs(transaction.amount);
      dailySpending.set(date, (dailySpending.get(date) || 0) + amount);
    });

    const trendData: TimeSeriesDataPoint[] = Array.from(dailySpending.entries())
      .map(([date, amount]) => ({
        date,
        value: amount
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Spending patterns
    const spendingPattern: SpendingPattern = {
      dailyAverage: totalExpenses / Math.max(trendData.length, 1),
      weeklyDistribution: new Array(7).fill(0),
      monthlyTrend: 0, // Simplified calculation
      topSpendingDays: trendData
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
        .map(item => ({
          date: item.date,
          amount: item.value
        }))
    };

    // Calculate weekly distribution
    expenseTransactions.forEach(transaction => {
      const dayOfWeek = new Date(transaction.date).getDay();
      spendingPattern.weeklyDistribution[dayOfWeek] += Math.abs(transaction.amount);
    });

    const result = {
      categories,
      totalExpenses,
      transactionCount: expenseTransactions.length,
      averageTransaction: totalExpenses / expenseTransactions.length || 0,
      trendData,
      spendingPattern,
      categoryChartData: categories.map(cat => ({
        label: cat.name,
        value: cat.total,
        percentage: cat.percentage,
        color: cat.color
      }))
    };
    
    return result;
  }, [transactions, sortBy]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`;
  };

  if (loading || externalLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <LoadingSpinner size="lg" text={t('analytics.loading.spendingAnalysis')} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <EmptyState
          icon={<AlertTriangle className="w-8 h-8 text-red-500" />}
          title={error}
          description={t('analytics.retry')}
          action={
            <Button onClick={() => window.location.reload()} variant="outline">
              {t('analytics.refresh')}
            </Button>
          }
        />
      </div>
    );
  }

  if (!loading && !externalLoading && (!spendingData || !transactions?.length)) {
    return (
      <div className={className}>
        <EmptyState
          icon={<PieChart className="w-8 h-8 text-muted-foreground" />}
          title={t('analytics.noData')}
          description={t('analytics.noDataDescription')}
        />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t('analytics.spendingAnalysis')}</h2>
          <p className="text-muted-foreground">
            {t('analytics.spendingAnalysisDescription')} ({spendingData.transactionCount} {t('analytics.transactions')})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={(value: 'amount' | 'count' | 'trend') => setSortBy(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('analytics.sortBy')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="amount">{t('analytics.byAmount')}</SelectItem>
              <SelectItem value="count">{t('analytics.byCount')}</SelectItem>
              <SelectItem value="trend">{t('analytics.byTrend')}</SelectItem>
            </SelectContent>
          </Select>
          <ExportDialog
            transactions={transactions}
            dateRange={dateRange}
            dashboardData={{
              financial_summary: {
                total_income: 0,
                total_expenses: spendingData?.totalExpenses || 0,
                net_income: -(spendingData?.totalExpenses || 0),
                previous_period_comparison: {
                  income_change: 0,
                  expense_change: 0,
                  net_change: 0
                }
              },
              top_categories: {
                income: [],
                expenses: spendingData?.categoryChartData || []
              },
              recent_trends: spendingData?.trendData || [],
              budget_status: [],
              account_balances: [],
              insights: [],
              quick_stats: {
                transactions_this_month: spendingData?.transactionCount || 0,
                largest_expense: {
                  amount: 0,
                  description: '',
                  category: ''
                },
                savings_rate: 0,
                spending_velocity: 0
              }
            }}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title={t('analytics.totalSpending')}
          value={spendingData.totalExpenses}
          subtitle={t('analytics.thisMonth')}
          icon={DollarSign}
        />
        <MetricCard
          title={t('analytics.averageTransaction')}
          value={spendingData.averageTransaction}
          subtitle={`${spendingData.transactionCount} ${t('analytics.transactions')}`}
          icon={ArrowUpDown}
        />
        <MetricCard
          title={t('analytics.dailyAverage')}
          value={spendingData.spendingPattern.dailyAverage}
          subtitle={t('analytics.spendingRate')}
          icon={Calendar}
        />
        <MetricCard
          title={t('analytics.topCategory')}
          value={spendingData.categories[0]?.name || 'N/A'}
          subtitle={`${spendingData.categories[0]?.percentage.toFixed(1)}% ${t('analytics.ofTotal')}`}
          icon={Target}
        />
      </div>

      {/* Analysis Tabs */}
      <Tabs value={analysisView} onValueChange={(value: any) => setAnalysisView(value)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{t('analytics.overview')}</TabsTrigger>
          <TabsTrigger value="categories">{t('analytics.categories')}</TabsTrigger>
          <TabsTrigger value="trends">{t('analytics.trends')}</TabsTrigger>
          <TabsTrigger value="patterns">{t('analytics.patterns')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Pie Chart */}
            <CategoryPieChart
              title={t('analytics.spendingByCategory')}
              description={t('analytics.categoryDistribution')}
              data={spendingData.categoryChartData}
              height={350}
            />

            {/* Spending Trend */}
            <TrendLineChart
              title={t('analytics.dailySpendingTrend')}
              description={t('analytics.spendingOverTime')}
              data={spendingData.trendData}
              height={350}
            />
          </div>

          {/* Top Categories List */}
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.topSpendingCategories')}</CardTitle>
              <CardDescription>{t('analytics.detailedCategoryBreakdown')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {spendingData.categories.slice(0, 8).map((category, index) => (
                  <div key={category.name} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: category.color }}
                      />
                      <div>
                        <p className="font-medium">{category.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {category.transactionCount} {t('analytics.transactions')} • 
                          {t('analytics.avg')} {formatCurrency(category.averageAmount)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(category.total)}</p>
                      <p className="text-sm text-muted-foreground">
                        {category.percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.detailedCategoryAnalysis')}</CardTitle>
              <CardDescription>{t('analytics.categoryAnalysisDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {spendingData.categories.map((category) => (
                  <div key={category.name} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                        <h4 className="font-semibold">{category.name}</h4>
                        <Badge variant="secondary">{category.transactionCount}</Badge>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{formatCurrency(category.total)}</p>
                        <p className="text-sm text-muted-foreground">{category.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{t('analytics.averageTransaction')}</span>
                        <span className="font-medium">{formatCurrency(category.averageAmount)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{t('analytics.monthlyAverage')}</span>
                        <span className="font-medium">{formatCurrency(category.monthlyAverage)}</span>
                      </div>
                      <Progress 
                        value={category.percentage} 
                        className="h-2"
                        style={{ 
                          '--progress-background': category.color,
                        } as any}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <TrendLineChart
            title={t('analytics.spendingTrends')}
            description={t('analytics.trendAnalysis')}
            data={spendingData.trendData}
            height={400}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('analytics.topSpendingDays')}</CardTitle>
                <CardDescription>{t('analytics.highestSpendingDays')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {spendingData.spendingPattern.topSpendingDays.map((day, index) => (
                    <div key={day.date} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <span className="text-sm">
                          {new Date(day.date).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="font-semibold">{formatCurrency(day.amount)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('analytics.weeklyPattern')}</CardTitle>
                <CardDescription>{t('analytics.spendingByDayOfWeek')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
                    const amount = spendingData.spendingPattern.weeklyDistribution[index];
                    const maxAmount = Math.max(...spendingData.spendingPattern.weeklyDistribution);
                    const percentage = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
                    
                    return (
                      <div key={day} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{day}</span>
                          <span className="font-medium">{formatCurrency(amount)}</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  {t('analytics.spendingVelocity')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">
                    {formatCurrency(spendingData.spendingPattern.dailyAverage)}
                  </p>
                  <p className="text-sm text-muted-foreground">{t('analytics.dailyRate')}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  {t('analytics.efficiency')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">
                    {spendingData.categories.length}
                  </p>
                  <p className="text-sm text-muted-foreground">{t('analytics.activeCategories')}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {t('analytics.frequency')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {(spendingData.transactionCount / 30).toFixed(1)}
                  </p>
                  <p className="text-sm text-muted-foreground">{t('analytics.transactionsPerDay')}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};