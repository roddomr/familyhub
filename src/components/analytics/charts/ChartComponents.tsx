import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { ChartDataPoint, TimeSeriesDataPoint, ChartData } from '@/types/analytics';

// Color palette for charts
const COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280'  // Gray
];

interface BaseChartProps {
  title?: string;
  description?: string;
  className?: string;
}

// Income vs Expense Bar Chart
interface IncomeExpenseBarChartProps extends BaseChartProps {
  data: TimeSeriesDataPoint[];
  height?: number;
}

export const IncomeExpenseBarChart: React.FC<IncomeExpenseBarChartProps> = ({
  title = "Income vs Expenses",
  description = "Daily comparison of income and expenses",
  data,
  height = 300,
  className
}) => {
  // Process data to show income and expenses separately
  const chartData = data.map(point => ({
    date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    income: point.metadata?.income || 0,
    expenses: point.metadata?.expense || 0,
    net: point.value
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip
              formatter={(value: number, name: string) => [
                new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD'
                }).format(value),
                name.charAt(0).toUpperCase() + name.slice(1)
              ]}
            />
            <Legend />
            <Bar dataKey="income" fill="#10B981" name="Income" />
            <Bar dataKey="expenses" fill="#EF4444" name="Expenses" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Category Breakdown Pie Chart
interface CategoryPieChartProps extends BaseChartProps {
  data: ChartDataPoint[];
  height?: number;
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  title = "Category Breakdown",
  description = "Spending distribution by category",
  data,
  height = 300,
  className
}) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percentage }) => `${name} ${percentage?.toFixed(1)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [
                new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD'
                }).format(value),
                'Amount'
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Trend Line Chart
interface TrendLineChartProps extends BaseChartProps {
  data: TimeSeriesDataPoint[];
  height?: number;
}

export const TrendLineChart: React.FC<TrendLineChartProps> = ({
  title = "Financial Trends",
  description = "Net income trends over time",
  data,
  height = 300,
  className
}) => {
  const chartData = data.map(point => ({
    date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: point.value,
    income: point.metadata?.income || 0,
    expenses: point.metadata?.expense || 0
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip
              formatter={(value: number, name: string) => [
                new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD'
                }).format(value),
                name === 'value' ? 'Net Income' : name.charAt(0).toUpperCase() + name.slice(1)
              ]}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#3B82F6" 
              strokeWidth={3}
              name="Net Income"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Area Chart for cumulative trends
interface AreaTrendChartProps extends BaseChartProps {
  data: TimeSeriesDataPoint[];
  height?: number;
}

export const AreaTrendChart: React.FC<AreaTrendChartProps> = ({
  title = "Cumulative Trends",
  description = "Income and expenses over time",
  data,
  height = 300,
  className
}) => {
  const chartData = data.map(point => ({
    date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    income: point.metadata?.income || 0,
    expenses: point.metadata?.expense || 0
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip
              formatter={(value: number, name: string) => [
                new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD'
                }).format(value),
                name.charAt(0).toUpperCase() + name.slice(1)
              ]}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="income" 
              stackId="1"
              stroke="#10B981" 
              fill="#10B981"
              fillOpacity={0.6}
              name="Income"
            />
            <Area 
              type="monotone" 
              dataKey="expenses" 
              stackId="2"
              stroke="#EF4444" 
              fill="#EF4444"
              fillOpacity={0.6}
              name="Expenses"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Budget Progress Component
interface BudgetProgressProps extends BaseChartProps {
  budgets: Array<{
    name: string;
    budgeted: number;
    spent: number;
    category: string;
  }>;
}

export const BudgetProgressChart: React.FC<BudgetProgressProps> = ({
  title = "Budget Progress",
  description = "Current spending vs budget goals",
  budgets,
  className
}) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {budgets.map((budget, index) => {
            const percentage = (budget.spent / budget.budgeted) * 100;
            const remaining = budget.budgeted - budget.spent;
            const status = percentage > 100 ? 'over' : percentage > 80 ? 'warning' : 'good';
            
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{budget.name}</p>
                    <p className="text-sm text-muted-foreground">{budget.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      ${budget.spent.toLocaleString()} / ${budget.budgeted.toLocaleString()}
                    </p>
                    <p className={`text-sm ${
                      status === 'over' ? 'text-red-600' : 
                      status === 'warning' ? 'text-yellow-600' : 
                      'text-green-600'
                    }`}>
                      {remaining >= 0 ? `$${remaining.toLocaleString()} left` : `$${Math.abs(remaining).toLocaleString()} over`}
                    </p>
                  </div>
                </div>
                <Progress 
                  value={Math.min(percentage, 100)} 
                  className={`h-2 ${
                    status === 'over' ? 'bg-red-100' :
                    status === 'warning' ? 'bg-yellow-100' :
                    'bg-green-100'
                  }`}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span className={
                    status === 'over' ? 'text-red-600 font-semibold' :
                    status === 'warning' ? 'text-yellow-600 font-semibold' :
                    ''
                  }>
                    {percentage.toFixed(1)}%
                  </span>
                  <span>100%</span>
                </div>
              </div>
            );
          })}
          {budgets.length === 0 && (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              <p>No budget data available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Simple metrics cards
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
  };
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  className
}) => {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">
              {typeof value === 'number' 
                ? new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                  }).format(value)
                : value
              }
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          {Icon && (
            <div className="p-2 bg-primary/10 rounded-full">
              <Icon className="w-6 h-6 text-primary" />
            </div>
          )}
        </div>
        {trend && (
          <div className="mt-2 flex items-center text-sm">
            <span className={`font-medium ${
              trend.value >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend.value >= 0 ? '+' : ''}{trend.value.toFixed(1)}%
            </span>
            <span className="text-muted-foreground ml-1">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};