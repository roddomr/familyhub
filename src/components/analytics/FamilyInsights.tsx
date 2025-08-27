import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { LoadingSpinner, EmptyState } from '@/components/ui/loading-states';
import { CardSkeleton } from '@/components/ui/skeleton-loader';
import { 
  Users,
  RefreshCw,
  Calendar,
  TrendingUp,
  PieChart,
  BarChart3,
  Target,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import { useFamilyInsights } from '@/hooks/useFamilyInsights';
import { 
  FamilyMemberSpendingChart,
  SharedVsIndividualChart,
  SpendingComparisonRanking,
  FinancialHealthInsights,
  MemberSpendingTrends
} from './charts/FamilyInsightsCharts';
import { cn } from '@/lib/utils';
import type { DateRange } from '@/types/analytics';

interface FamilyInsightsProps {
  dateRange?: DateRange;
  className?: string;
}

export const FamilyInsights: React.FC<FamilyInsightsProps> = ({
  dateRange = 'last_30_days',
  className
}) => {
  const { t } = useTranslation();
  const [selectedMetric, setSelectedMetric] = useState<'total_expenses' | 'transaction_count' | 'avg_transaction_amount'>('total_expenses');
  const [activeTab, setActiveTab] = useState('overview');

  // Convert DateRange to actual dates
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

  const dateRangeBoundaries = getDateRangeBoundaries(dateRange);
  
  const { 
    data, 
    loading, 
    error, 
    lastUpdated, 
    fetchInsights,
    refreshInsights 
  } = useFamilyInsights({
    dateRange: dateRangeBoundaries,
    autoFetch: false
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getSavingsRateColor = (rate: number) => {
    if (rate < 0) return 'text-red-600';
    if (rate < 10) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading && !data) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center justify-between">
          <CardSkeleton className="h-8 w-48" />
          <CardSkeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
    );
  }

  if (error) {
    return (
      <div className={cn("space-y-6", className)}>
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('analytics.familyInsights.failedToLoadFamilyInsights')}</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={refreshInsights}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {t('analytics.familyInsights.tryAgain')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">{t('analytics.familyInsights.noFamilyData')}</h3>
        <p className="text-muted-foreground mb-6">
          {!data ? t('analytics.familyInsights.clickToLoadInsights') : t('analytics.familyInsights.noFamilyDataDescription')}
        </p>
        {!data && !loading && (
          <Button onClick={() => fetchInsights()} variant="outline">
            <TrendingUp className="w-4 h-4 mr-2" />
            {t('analytics.familyInsights.loadFamilyInsights')}
          </Button>
        )}
      </div>
    );
  }

  const { familyTotals, memberSpending, sharedVsIndividual, spendingComparison, financialHealthInsights } = data;
  const savingsRate = familyTotals.totalIncome > 0 
    ? ((familyTotals.totalIncome - familyTotals.totalExpenses) / familyTotals.totalIncome) * 100 
    : 0;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-primary" />
            {t('analytics.familyInsights.title')}
          </h2>
          <p className="text-muted-foreground">
            {t('analytics.familyInsights.familyInsightsDescription')}
          </p>
        </div>
        
        <Button 
          variant="outline" 
          onClick={refreshInsights}
          disabled={loading}
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          {loading ? t('analytics.refreshing') : t('analytics.refresh')}
        </Button>
      </div>

      {/* Family Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('analytics.familyInsights.familyMembers')}</p>
                <p className="text-2xl font-bold">{familyTotals.memberCount}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {t('analytics.familyInsights.totalTransactions', { count: familyTotals.transactionCount })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('analytics.totalIncome')}</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(familyTotals.totalIncome)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('analytics.totalExpenses')}</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(familyTotals.totalExpenses)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('analytics.familyInsights.savingsRate')}</p>
                <p className={cn("text-2xl font-bold", getSavingsRateColor(savingsRate))}>
                  {savingsRate.toFixed(1)}%
                </p>
              </div>
              <Target className="w-8 h-8 text-blue-600" />
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {formatCurrency(familyTotals.netIncome)} {t('analytics.familyInsights.netIncome')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{t('analytics.overview')}</TabsTrigger>
          <TabsTrigger value="members">{t('analytics.familyInsights.familyMembers')}</TabsTrigger>
          <TabsTrigger value="patterns">{t('analytics.patterns')}</TabsTrigger>
          <TabsTrigger value="insights">{t('analytics.familyInsights.insights')}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FamilyMemberSpendingChart data={memberSpending} />
            <SharedVsIndividualChart data={sharedVsIndividual} />
          </div>
          
          {sharedVsIndividual.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('analytics.familyInsights.expenseDistribution')}</CardTitle>
                <CardDescription>
                  {t('analytics.familyInsights.expenseDistributionDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {sharedVsIndividual.map((item) => (
                    <div key={item.analysis_type} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium capitalize">
                          {item.analysis_type === 'shared' 
                            ? t('analytics.familyInsights.sharedExpenses')
                            : t('analytics.familyInsights.individualExpenses')
                          }
                        </h4>
                        <Badge variant="outline">
                          {item.percentage_of_total.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold">
                        {formatCurrency(item.total_amount)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t('analytics.familyInsights.transactionsSummary', { count: item.transaction_count, avg: formatCurrency(item.avg_amount) })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MemberSpendingTrends data={memberSpending} />
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">{t('analytics.familyInsights.rankingMetric')}</label>
                <Select value={selectedMetric} onValueChange={(value: any) => setSelectedMetric(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total_expenses">{t('analytics.familyInsights.totalExpensesRanking')}</SelectItem>
                    <SelectItem value="transaction_count">{t('analytics.familyInsights.transactionCountRanking')}</SelectItem>
                    <SelectItem value="avg_transaction_amount">{t('analytics.familyInsights.avgTransactionRanking')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <SpendingComparisonRanking data={spendingComparison} metric={selectedMetric} />
            </div>
          </div>
        </TabsContent>

        {/* Patterns Tab */}
        <TabsContent value="patterns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.familyInsights.spendingCategoriesByMember')}</CardTitle>
              <CardDescription>
                {t('analytics.familyInsights.mostUsedCategories')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {memberSpending.map((member) => (
                  <div key={member.user_id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{member.full_name}</h4>
                        <p className="text-sm text-muted-foreground capitalize">
                          {member.role}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          {t('analytics.familyInsights.mostUsed')} {member.most_used_category}
                        </div>
                        <div className="text-sm">
                          {formatCurrency(member.avg_transaction_amount)} {t('analytics.familyInsights.avgTransaction')}
                        </div>
                      </div>
                    </div>
                    
                    {Object.keys(member.category_breakdown).length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {Object.entries(member.category_breakdown)
                          .sort(([,a], [,b]) => b - a)
                          .slice(0, 6)
                          .map(([category, amount]) => (
                            <div key={category} className="text-center p-2 bg-muted rounded text-sm">
                              <div className="font-medium">{formatCurrency(amount)}</div>
                              <div className="text-xs text-muted-foreground">{category}</div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights">
          <FinancialHealthInsights insights={financialHealthInsights} />
        </TabsContent>
      </Tabs>

      {lastUpdated && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          {t('analytics.lastUpdated')} {lastUpdated.toLocaleString()}
        </div>
      )}
    </div>
  );
};