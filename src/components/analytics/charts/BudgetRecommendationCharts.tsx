import React from 'react';
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
  ComposedChart,
  Line,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp,
  TrendingDown,
  Target,
  PieChart as PieChartIcon,
  BarChart3,
  Shield,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  BudgetRecommendationsData,
  BudgetTemplate,
  BudgetPerformance
} from '@/types/budgetRecommendations';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

interface BudgetRecommendationChartsProps {
  data: BudgetRecommendationsData;
}

export const BudgetRecommendationCharts: React.FC<BudgetRecommendationChartsProps> = ({ data }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Prepare chart data
  const savingsChartData = data.recommendations
    .filter(rec => rec.potential_savings > 0)
    .map(rec => ({
      category: rec.category_name.length > 15 
        ? rec.category_name.substring(0, 15) + '...'
        : rec.category_name,
      current: rec.current_spending,
      recommended: rec.recommended_budget,
      savings: rec.potential_savings,
      confidence: rec.confidence_score * 100
    }));

  const recommendationTypeData = data.recommendations.reduce((acc, rec) => {
    const existing = acc.find(item => item.type === rec.recommendation_type);
    if (existing) {
      existing.count += 1;
      existing.totalSavings += rec.potential_savings;
    } else {
      acc.push({
        type: rec.recommendation_type,
        count: 1,
        totalSavings: rec.potential_savings,
        label: rec.recommendation_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
      });
    }
    return acc;
  }, [] as any[]);

  return (
    <div className="space-y-6">
      {/* Savings Potential Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Savings Potential by Category
          </CardTitle>
          <CardDescription>
            Compare current spending vs recommended budgets across categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          {savingsChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={savingsChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis yAxisId="left" tickFormatter={formatCurrency} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'confidence' ? `${value}%` : formatCurrency(value),
                    name === 'current' ? 'Current Spending' :
                    name === 'recommended' ? 'Recommended Budget' : 
                    name === 'savings' ? 'Potential Savings' : 'Confidence %'
                  ]}
                />
                <Legend />
                <Bar dataKey="current" fill="#EF4444" name="Current Spending" yAxisId="left" />
                <Bar dataKey="recommended" fill="#3B82F6" name="Recommended Budget" yAxisId="left" />
                <Bar dataKey="savings" fill="#10B981" name="Potential Savings" yAxisId="left" />
                <Line 
                  dataKey="confidence" 
                  stroke="#F59E0B" 
                  strokeWidth={3}
                  name="Confidence %"
                  yAxisId="right"
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No savings recommendations available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendation Types Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5" />
              Recommendation Types
            </CardTitle>
            <CardDescription>
              Distribution of recommendation categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recommendationTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={recommendationTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {recommendationTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, 'Count']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No recommendation data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Savings Impact by Type
            </CardTitle>
            <CardDescription>
              Potential savings by recommendation type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendationTypeData.map((item, index) => (
                <div key={item.type} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div>
                      <div className="font-medium">{item.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.count} recommendation{item.count !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">
                      {formatCurrency(item.totalSavings)}
                    </div>
                    <div className="text-sm text-muted-foreground">potential savings</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confidence Score Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Recommendation Confidence Analysis
          </CardTitle>
          <CardDescription>
            Confidence levels across different recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.recommendations
              .sort((a, b) => b.confidence_score - a.confidence_score)
              .map((rec, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{rec.category_name}</h4>
                      <Badge 
                        variant={rec.confidence_score >= 0.8 ? 'default' : 
                               rec.confidence_score >= 0.6 ? 'secondary' : 'destructive'}
                      >
                        {Math.round(rec.confidence_score * 100)}% confidence
                      </Badge>
                    </div>
                    <Progress 
                      value={rec.confidence_score * 100} 
                      className="mb-2"
                    />
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Potential savings: {formatCurrency(rec.potential_savings)}</span>
                      <span className={cn(
                        "flex items-center gap-1",
                        rec.confidence_score >= 0.8 ? "text-green-600" : 
                        rec.confidence_score >= 0.6 ? "text-yellow-600" : "text-red-600"
                      )}>
                        {rec.confidence_score >= 0.8 ? (
                          <><CheckCircle2 className="w-3 h-3" /> High confidence</>
                        ) : rec.confidence_score >= 0.6 ? (
                          <><AlertTriangle className="w-3 h-3" /> Medium confidence</>
                        ) : (
                          <><AlertTriangle className="w-3 h-3" /> Low confidence</>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface BudgetTemplateCardProps {
  template: BudgetTemplate;
  formatCurrency: (amount: number) => string;
}

export const BudgetTemplateCard: React.FC<BudgetTemplateCardProps> = ({ 
  template, 
  formatCurrency 
}) => {
  const totalAllocation = Object.values(template.category_allocations).reduce((sum, val) => sum + val, 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{template.template_name}</CardTitle>
            <CardDescription>{template.template_description}</CardDescription>
          </div>
          <Badge 
            variant={template.suitability_score >= 0.8 ? 'default' : 'secondary'}
          >
            {Math.round(template.suitability_score * 100)}% match
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category Allocations */}
        <div>
          <h4 className="font-medium mb-3">Budget Breakdown</h4>
          <div className="space-y-2">
            {Object.entries(template.category_allocations)
              .sort(([,a], [,b]) => b - a)
              .map(([category, amount]) => {
                const percentage = totalAllocation > 0 ? (amount / totalAllocation) * 100 : 0;
                return (
                  <div key={category} className="flex items-center justify-between text-sm">
                    <span>{category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{percentage.toFixed(0)}%</span>
                      <span className="font-medium">{formatCurrency(amount)}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Total */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between font-semibold">
            <span>Total Monthly Budget</span>
            <span>{formatCurrency(totalAllocation)}</span>
          </div>
        </div>

        {/* Pros and Cons */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <h5 className="font-medium text-green-600 mb-2 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              Pros
            </h5>
            <ul className="text-sm space-y-1">
              {template.pros_cons.pros.map((pro, index) => (
                <li key={index} className="text-muted-foreground">• {pro}</li>
              ))}
            </ul>
          </div>
          <div>
            <h5 className="font-medium text-red-600 mb-2 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              Cons
            </h5>
            <ul className="text-sm space-y-1">
              {template.pros_cons.cons.map((con, index) => (
                <li key={index} className="text-muted-foreground">• {con}</li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface BudgetPerformanceChartProps {
  data: BudgetPerformance[];
}

export const BudgetPerformanceChart: React.FC<BudgetPerformanceChartProps> = ({ data }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const chartData = data.map(item => ({
    category: item.category_name.length > 15 
      ? item.category_name.substring(0, 15) + '...'
      : item.category_name,
    budgeted: item.budgeted_amount,
    spent: item.actual_spent,
    variance: item.variance,
    variancePercent: item.variance_percentage,
    status: item.performance_status
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Budget Performance Analysis
        </CardTitle>
        <CardDescription>
          Compare budgeted vs actual spending across categories
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis tickFormatter={formatCurrency} />
            <Tooltip 
              formatter={(value: number, name: string) => [
                formatCurrency(value),
                name === 'budgeted' ? 'Budgeted Amount' : 'Actual Spent'
              ]}
            />
            <Legend />
            <Bar dataKey="budgeted" fill="#3B82F6" name="Budgeted" />
            <Bar dataKey="spent" fill="#EF4444" name="Actual Spent" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};