import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner, EmptyState } from '@/components/ui/loading-states';
import { CardSkeleton } from '@/components/ui/skeleton-loader';
import { 
  Target,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PiggyBank,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  Calculator,
  BarChart3,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  Award
} from 'lucide-react';
import { useBudgetRecommendations } from '@/hooks/useBudgetRecommendations';
import {
  BudgetRecommendationCharts,
  BudgetTemplateCard,
  BudgetPerformanceChart
} from './charts/BudgetRecommendationCharts';
import { cn } from '@/lib/utils';
import type { DateRange } from '@/types/analytics';
import type { BudgetRecommendation, BudgetTemplate } from '@/types/budgetRecommendations';

interface BudgetRecommendationsProps {
  dateRange?: DateRange;
  className?: string;
}

export const BudgetRecommendations: React.FC<BudgetRecommendationsProps> = ({
  dateRange = 'last_30_days',
  className
}) => {
  const { t } = useTranslation();
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [activeTab, setActiveTab] = useState('recommendations');

  // Convert DateRange to actual dates (extended for budget analysis)
  const getDateRangeBoundaries = (range: DateRange) => {
    const now = new Date();
    const start = new Date();
    
    switch (range) {
      case 'last_7_days':
        start.setDate(now.getDate() - 30); // Extend for better budget analysis
        break;
      case 'last_30_days':
        start.setDate(now.getDate() - 90); // 3 months for budget recommendations
        break;
      case 'last_90_days':
        start.setDate(now.getDate() - 180); // 6 months
        break;
      case 'last_year':
        start.setFullYear(now.getFullYear() - 1);
        break;
      case 'current_month':
        start.setMonth(now.getMonth() - 3, 1); // Last 3 months
        break;
      case 'current_year':
        start.setMonth(0, 1);
        break;
      default:
        start.setDate(now.getDate() - 90);
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
    fetchRecommendations,
    refreshRecommendations 
  } = useBudgetRecommendations({
    dateRange: dateRangeBoundaries,
    monthlyIncome,
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

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'reduce_category':
        return <TrendingDown className="w-5 h-5 text-red-600" />;
      case 'emergency_fund':
        return <Shield className="w-5 h-5 text-blue-600" />;
      case 'increase_savings':
        return <PiggyBank className="w-5 h-5 text-green-600" />;
      default:
        return <Target className="w-5 h-5 text-gray-600" />;
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-100 text-green-800';
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const handleIncomeSubmit = () => {
    if (monthlyIncome > 0) {
      fetchRecommendations({ monthlyIncome });
    }
  };

  if (loading && !data) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center justify-between">
          <CardSkeleton className="h-8 w-48" />
          <CardSkeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CardSkeleton className="h-32" />
          <CardSkeleton className="h-32" />
          <CardSkeleton className="h-32" />
        </div>
        <CardSkeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("space-y-6", className)}>
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('analytics.budgetRecommendations.failedToLoadBudgetRecommendations')}</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={refreshRecommendations}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {t('common.tryAgain')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6 text-brand-primary" />
            {t('analytics.budgetRecommendations.title')}
          </h2>
          <p className="text-muted-foreground">
            {t('analytics.budgetRecommendations.subtitle')}
          </p>
        </div>
        
        <Button 
          variant="outline" 
          onClick={refreshRecommendations}
          disabled={loading}
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          {loading ? t('analytics.refreshing') : t('analytics.refresh')}
        </Button>
      </div>

      {/* Income Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            {t('analytics.budgetRecommendations.monthlyIncomeSetup')}
          </CardTitle>
          <CardDescription>
            {t('analytics.budgetRecommendations.monthlyIncomeDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="monthly-income">{t('analytics.budgetRecommendations.monthlyIncomeLabel')}</Label>
              <Input
                id="monthly-income"
                type="number"
                placeholder={t('analytics.budgetRecommendations.monthlyIncomePlaceholder')}
                value={monthlyIncome || ''}
                onChange={(e) => setMonthlyIncome(parseFloat(e.target.value) || 0)}
              />
            </div>
            <Button onClick={handleIncomeSubmit} disabled={!monthlyIncome || monthlyIncome <= 0}>
              {t('analytics.budgetRecommendations.updateRecommendations')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('analytics.budgetRecommendations.potentialSavings')}</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(data.totalPotentialSavings)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {t('analytics.budgetRecommendations.basedOnRecommendations', { count: data.recommendations.length })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('analytics.budgetRecommendations.highConfidenceTips')}</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {data.highConfidenceRecommendations.length}
                  </p>
                </div>
                <Award className="w-8 h-8 text-blue-600" />
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {t('analytics.budgetRecommendations.highConfidenceDescription')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('analytics.budgetRecommendations.emergencyFundStatus')}</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {data.emergencyFundStatus.hasRecommendation ? t('analytics.budgetRecommendations.needed') : t('analytics.budgetRecommendations.good')}
                  </p>
                </div>
                <Shield className="w-8 h-8 text-orange-600" />
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                {data.emergencyFundStatus.hasRecommendation 
                  ? `${t('analytics.budgetRecommendations.target')}: ${formatCurrency(data.emergencyFundStatus.targetAmount || 0)}`
                  : t('analytics.budgetRecommendations.emergencyFundGood')
                }
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recommendations">{t('analytics.budgetRecommendations.recommendations')}</TabsTrigger>
          <TabsTrigger value="templates">{t('analytics.budgetRecommendations.budgetTemplates')}</TabsTrigger>
          <TabsTrigger value="analysis">{t('analytics.budgetRecommendations.analysis')}</TabsTrigger>
        </TabsList>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-6">
          {data?.recommendations && data.recommendations.length > 0 ? (
            <div className="space-y-4">
              {data.recommendations.map((rec, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {getRecommendationIcon(rec.recommendation_type)}
                        <div>
                          <CardTitle className="text-lg">{rec.category_name}</CardTitle>
                          <CardDescription>{rec.reason}</CardDescription>
                        </div>
                      </div>
                      <Badge className={getConfidenceColor(rec.confidence_score)}>
                        {Math.round(rec.confidence_score * 100)}% {t('analytics.budgetRecommendations.confidence')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <div className="text-lg font-semibold text-red-600">
                          {formatCurrency(rec.current_spending)}
                        </div>
                        <div className="text-sm text-muted-foreground">{t('analytics.budgetRecommendations.currentSpending')}</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-lg font-semibold text-blue-600">
                          {formatCurrency(rec.recommended_budget)}
                        </div>
                        <div className="text-sm text-muted-foreground">{t('analytics.budgetRecommendations.recommendedBudget')}</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-lg font-semibold text-green-600">
                          {formatCurrency(rec.potential_savings)}
                        </div>
                        <div className="text-sm text-muted-foreground">{t('analytics.budgetRecommendations.potentialSavingsItem')}</div>
                      </div>
                    </div>

                    {/* Action Items */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" />
                        {t('analytics.budgetRecommendations.actionItems')}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        {rec.action_items.set_monthly_limit && (
                          <div>• {t('analytics.budgetRecommendations.actionItems.setMonthlyLimit')}: {formatCurrency(rec.action_items.set_monthly_limit)}</div>
                        )}
                        {rec.action_items.track_daily && (
                          <div>• {t('analytics.budgetRecommendations.actionItems.enableDailyTracking')}</div>
                        )}
                        {rec.action_items.review_frequency && (
                          <div>• {t('analytics.budgetRecommendations.actionItems.review')} {rec.action_items.review_frequency}</div>
                        )}
                        {rec.action_items.suggest_alternatives && (
                          <div>• {t('analytics.budgetRecommendations.actionItems.lookForAlternatives')}</div>
                        )}
                        {rec.action_items.start_amount && (
                          <div>• {t('analytics.budgetRecommendations.actionItems.startWith')}: {formatCurrency(rec.action_items.start_amount)}</div>
                        )}
                        {rec.action_items.monthly_target && (
                          <div>• {t('analytics.budgetRecommendations.actionItems.monthlyTarget')}: {formatCurrency(rec.action_items.monthly_target)}</div>
                        )}
                        {rec.action_items.automate && (
                          <div>• {t('analytics.budgetRecommendations.actionItems.setupAutoTransfers')}</div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('analytics.budgetRecommendations.noRecommendationsAvailable')}</h3>
              <p className="text-muted-foreground mb-6">
                {!data ? t('analytics.budgetRecommendations.clickToLoadRecommendations') : t('analytics.budgetRecommendations.addIncomeForRecommendations')}
              </p>
              {!data && !loading && (
                <Button onClick={() => fetchRecommendations()} variant="outline">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  {t('analytics.budgetRecommendations.loadBudgetRecommendations')}
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          {data?.templates && data.templates.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {data.templates.map((template, index) => (
                <BudgetTemplateCard 
                  key={index} 
                  template={template}
                  formatCurrency={formatCurrency}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('analytics.budgetRecommendations.noBudgetTemplatesAvailable')}</h3>
              <p className="text-muted-foreground mb-6">
                {!data ? t('analytics.budgetRecommendations.clickToLoadTemplates') : t('analytics.budgetRecommendations.addIncomeForTemplates')}
              </p>
              {!data && !loading && (
                <Button onClick={() => fetchRecommendations()} variant="outline">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  {t('analytics.budgetRecommendations.loadBudgetTemplates')}
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-6">
          {data?.recommendations && (
            <BudgetRecommendationCharts data={data} />
          )}
        </TabsContent>
      </Tabs>

      {lastUpdated && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="w-4 h-4" />
          {t('analytics.lastUpdated')} {lastUpdated.toLocaleString()}
        </div>
      )}
    </div>
  );
};