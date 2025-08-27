import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  Line,
  Area,
  LineChart
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart as PieChartIcon,
  BarChart3,
  Target,
  AlertTriangle,
  Trophy,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  FamilyMemberSpending,
  SharedVsIndividualExpense,
  FamilySpendingComparison,
  FamilyFinancialHealthInsight,
  MemberSpendingChartData,
  CategoryComparisonChartData
} from '@/types/familyInsights';

const MEMBER_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
const ROLE_COLORS = {
  admin: '#3B82F6',
  parent: '#10B981', 
  member: '#F59E0B',
  child: '#EC4899'
};

interface FamilyMemberSpendingChartProps {
  data: FamilyMemberSpending[];
  height?: number;
}

export const FamilyMemberSpendingChart: React.FC<FamilyMemberSpendingChartProps> = ({ 
  data, 
  height = 300 
}) => {
  const { t } = useTranslation();
  const chartData: MemberSpendingChartData[] = data.map((member, index) => ({
    member_name: member.full_name.length > 12 
      ? member.full_name.substring(0, 12) + '...' 
      : member.full_name,
    role: member.role,
    expenses: member.total_expenses,
    income: member.total_income,
    net: member.total_income - member.total_expenses,
    color: MEMBER_COLORS[index % MEMBER_COLORS.length]
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.abs(value));
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.dataKey === 'expenses' ? t('analytics.familyInsights.expenses') : 
               entry.dataKey === 'income' ? t('analytics.familyInsights.income') : t('analytics.familyInsights.net')}
              : {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          {t('analytics.familyInsights.memberSpendingOverview')}
        </CardTitle>
        <CardDescription>
          {t('analytics.familyInsights.incomeVsExpensesComparison')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="member_name" />
            <YAxis tickFormatter={formatCurrency} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="income" fill="#10B981" name={t('analytics.totalIncome')} />
            <Bar dataKey="expenses" fill="#EF4444" name={t('analytics.totalExpenses')} />
            <Line dataKey="net" stroke="#3B82F6" strokeWidth={3} name={t('analytics.netIncome')} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

interface SharedVsIndividualChartProps {
  data: SharedVsIndividualExpense[];
  height?: number;
}

export const SharedVsIndividualChart: React.FC<SharedVsIndividualChartProps> = ({
  data,
  height = 250
}) => {
  const { t } = useTranslation();
  const chartData: CategoryComparisonChartData[] = [];
  
  if (data.length >= 2) {
    const sharedData = data.find(d => d.analysis_type === 'shared');
    const individualData = data.find(d => d.analysis_type === 'individual');
    
    if (sharedData && individualData) {
      // Combine categories from both datasets
      const allCategories = new Set([
        ...Object.keys(sharedData.top_categories || {}),
        ...Object.keys(individualData.top_categories || {})
      ]);
      
      allCategories.forEach(category => {
        chartData.push({
          category: category.length > 12 ? category.substring(0, 12) + '...' : category,
          shared: (sharedData.top_categories || {})[category] || 0,
          individual: (individualData.top_categories || {})[category] || 0,
          total: ((sharedData.top_categories || {})[category] || 0) + 
                ((individualData.top_categories || {})[category] || 0)
        });
      });
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="w-5 h-5" />
          {t('analytics.familyInsights.sharedVsIndividualExpenses')}
        </CardTitle>
        <CardDescription>
          {t('analytics.familyInsights.expensesByCategory')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="shared" stackId="a" fill="#3B82F6" name={t('analytics.familyInsights.sharedExpenses')} />
              <Bar dataKey="individual" stackId="a" fill="#10B981" name={t('analytics.familyInsights.individualExpenses')} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-32 flex items-center justify-center text-muted-foreground">
            {t('analytics.familyInsights.noCategoryData')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface SpendingComparisonRankingProps {
  data: FamilySpendingComparison[];
  metric: 'total_expenses' | 'transaction_count' | 'avg_transaction_amount';
}

export const SpendingComparisonRanking: React.FC<SpendingComparisonRankingProps> = ({
  data,
  metric
}) => {
  const { t } = useTranslation();
  const filteredData = data.filter(item => item.comparison_metric === metric);
  
  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'total_expenses': return t('analytics.familyInsights.totalExpensesRanking');
      case 'transaction_count': return t('analytics.familyInsights.transactionCountRanking');
      case 'avg_transaction_amount': return t('analytics.familyInsights.avgTransactionRanking');
      default: return metric;
    }
  };

  const formatValue = (value: number, metric: string) => {
    if (metric === 'transaction_count') {
      return value.toString();
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="w-4 h-4 text-yellow-500" />;
      case 2: return <Trophy className="w-4 h-4 text-gray-400" />;
      case 3: return <Trophy className="w-4 h-4 text-orange-600" />;
      default: return <User className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          {getMetricLabel(metric)}
        </CardTitle>
        <CardDescription>
          {t('analytics.familyInsights.familyMemberRankings')} {getMetricLabel(metric).toLowerCase()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {filteredData.map((member) => (
            <div 
              key={`${member.member_name}-${metric}`} 
              className="flex items-center justify-between p-3 rounded-lg border"
            >
              <div className="flex items-center gap-3">
                {getRankIcon(member.rank_position)}
                <div>
                  <div className="font-medium">{member.member_name}</div>
                  <div className="text-sm text-muted-foreground capitalize">
                    {member.member_role}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-semibold">
                  {formatValue(member.value, metric)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {member.percentage_of_family_total.toFixed(1)}% of family total
                </div>
              </div>
            </div>
          ))}
          
          {filteredData.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              {t('analytics.familyInsights.noRankingData')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface FinancialHealthInsightsProps {
  insights: FamilyFinancialHealthInsight[];
}

export const FinancialHealthInsights: React.FC<FinancialHealthInsightsProps> = ({ insights }) => {
  const { t, i18n } = useTranslation();
  
  const translateInsightMessage = (message: string): string => {
    // If we're in Spanish mode, try to translate common insight messages
    if (i18n.language === 'es') {
      const translations: Record<string, string> = {
        'Your family is spending more than earning. Immediate action needed to reduce expenses or increase income.': 'Tu familia está gastando más de lo que gana. Se necesita acción inmediata para reducir gastos o aumentar ingresos.',
        'Review all expenses immediately. Consider emergency budget cuts and look for additional income sources.': 'Revisa todos los gastos inmediatamente. Considera recortes de presupuesto de emergencia y busca fuentes de ingresos adicionales.'
      };
      
      return translations[message] || message;
    }
    return message;
  };
  const getImpactIcon = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'medium': return <Target className="w-5 h-5 text-yellow-500" />;
      case 'low': return <TrendingUp className="w-5 h-5 text-green-500" />;
      default: return <Target className="w-5 h-5 text-gray-500" />;
    }
  };

  const getImpactColor = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high': return 'bg-red-50 border-red-200';
      case 'medium': return 'bg-yellow-50 border-yellow-200';
      case 'low': return 'bg-green-50 border-green-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          {t('analytics.familyInsights.financialHealthInsights')}
        </CardTitle>
        <CardDescription>
          {t('analytics.familyInsights.aiPoweredRecommendations')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {insights.map((insight, index) => (
            <div 
              key={`${insight.insight_type}-${index}`}
              className={cn(
                "p-4 rounded-lg border-2",
                getImpactColor(insight.impact_level)
              )}
            >
              <div className="flex items-start gap-3">
                {getImpactIcon(insight.impact_level)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold">{insight.insight_title}</h4>
                    <Badge 
                      variant={insight.impact_level === 'high' ? 'destructive' : 
                              insight.impact_level === 'medium' ? 'default' : 'secondary'}
                    >
                      {t(`analytics.familyInsights.impactLevels.${insight.impact_level}`)} {t('analytics.familyInsights.impactLevel')}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    {translateInsightMessage(insight.insight_description)}
                  </p>
                  
                  <div className="bg-white p-3 rounded border">
                    <h5 className="font-medium text-sm mb-1">{t('analytics.familyInsights.recommendedAction')}</h5>
                    <p className="text-sm">{translateInsightMessage(insight.recommended_action)}</p>
                  </div>

                  {/* Display supporting data */}
                  {Object.keys(insight.supporting_data).length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      {Object.entries(insight.supporting_data).map(([key, value]) => (
                        <div key={key} className="text-center p-2 bg-white rounded border">
                          <div className="text-lg font-semibold">
                            {typeof value === 'number' ? 
                              (key.includes('rate') || key.includes('percent') ? 
                                `${value}%` : 
                                new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: 'USD',
                                  minimumFractionDigits: 0
                                }).format(value)
                              ) : 
                              String(value)
                            }
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {key.replace(/_/g, ' ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {insights.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t('analytics.familyInsights.noInsights')}</p>
              <p className="text-sm">{t('analytics.familyInsights.tryLongerPeriod')}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface MemberSpendingTrendsProps {
  data: FamilyMemberSpending[];
}

export const MemberSpendingTrends: React.FC<MemberSpendingTrendsProps> = ({ data }) => {
  const { t } = useTranslation();
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(Math.abs(value));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          {t('analytics.familyInsights.memberSpendingTrends')}
        </CardTitle>
        <CardDescription>
          {t('analytics.familyInsights.individualSpendingTrends')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((member, index) => (
            <div key={member.user_id} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback style={{ backgroundColor: ROLE_COLORS[member.role] }}>
                    {member.full_name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{member.full_name}</div>
                  <div className="text-sm text-muted-foreground capitalize">
                    {member.role} • {member.transaction_count} transactions
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-semibold">
                  {formatCurrency(member.total_expenses)}
                </div>
                <div className={cn(
                  "text-sm flex items-center gap-1",
                  member.spending_trend >= 0 ? "text-red-600" : "text-green-600"
                )}>
                  {member.spending_trend >= 0 ? 
                    <TrendingUp className="w-3 h-3" /> : 
                    <TrendingDown className="w-3 h-3" />
                  }
                  {Math.abs(member.spending_trend).toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};