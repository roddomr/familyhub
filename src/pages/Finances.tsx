import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import CreateFamilyDialog from '@/components/family/CreateFamilyDialog';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Wallet,
  PiggyBank,
  Building,
  ArrowUpRight,
  ArrowDownLeft,
  MoreHorizontal,
  Eye,
  EyeOff
} from 'lucide-react';
import { useFinances } from '@/hooks/useFinances';
import { useFamily } from '@/hooks/useFamily';
import { cn } from '@/lib/utils';

const Finances = () => {
  const [showBalances, setShowBalances] = useState(true);
  const [showCreateFamily, setShowCreateFamily] = useState(false);
  const { 
    accounts, 
    recentTransactions, 
    budgets, 
    totalBalance, 
    monthlyIncome, 
    monthlyExpenses,
    loading,
    error 
  } = useFinances();
  
  const { currentFamily, loading: familyLoading } = useFamily();

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'checking': return Wallet;
      case 'savings': return PiggyBank;
      case 'credit_card': return CreditCard;
      case 'investment': return TrendingUp;
      default: return Building;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getTransactionIcon = (type: string) => {
    return type === 'income' ? ArrowUpRight : ArrowDownLeft;
  };

  if (loading || familyLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Finances</h1>
              <p className="text-text-secondary mt-1">Loading your financial overview...</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg"></div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!currentFamily) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">Welcome to Family Hub!</h2>
            <p className="text-muted-foreground">Create or join a family to start tracking finances.</p>
            <Button onClick={() => setShowCreateFamily(true)}>
              Create Your First Family
            </Button>
          </div>
          <CreateFamilyDialog 
            open={showCreateFamily} 
            onOpenChange={setShowCreateFamily}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold">Finances</h1>
            <p className="text-text-secondary mt-1">
              Manage {currentFamily.name}'s financial health
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBalances(!showBalances)}
            >
              {showBalances ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showBalances ? 'Hide' : 'Show'} Balances
            </Button>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Transaction
            </Button>
          </div>
        </div>

        {/* Financial Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="card-elevated">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">Total Balance</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-2xl font-bold">
                      {showBalances ? formatCurrency(totalBalance) : '••••••'}
                    </p>
                    <TrendingUp className="w-5 h-5 text-success" />
                  </div>
                </div>
                <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-brand-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">Monthly Income</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-2xl font-bold text-success">
                      {showBalances ? formatCurrency(monthlyIncome) : '••••••'}
                    </p>
                    <ArrowUpRight className="w-5 h-5 text-success" />
                  </div>
                </div>
                <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">Monthly Expenses</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-2xl font-bold text-destructive">
                      {showBalances ? formatCurrency(monthlyExpenses) : '••••••'}
                    </p>
                    <ArrowDownLeft className="w-5 h-5 text-destructive" />
                  </div>
                </div>
                <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Accounts Section */}
          <Card className="card-elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Accounts</CardTitle>
                  <CardDescription>Your financial accounts overview</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Account
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {accounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No accounts added yet</p>
                  <p className="text-sm">Add your first account to get started</p>
                </div>
              ) : (
                accounts.map((account) => {
                  const IconComponent = getAccountIcon(account.type);
                  return (
                    <div key={account.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-brand-primary/10 rounded-lg flex items-center justify-center">
                          <IconComponent className="w-5 h-5 text-brand-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{account.name}</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {account.type.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {showBalances ? formatCurrency(account.balance || 0) : '••••••'}
                        </p>
                        <p className="text-sm text-muted-foreground">{account.currency}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card className="card-elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Transactions</CardTitle>
                  <CardDescription>Your latest financial activity</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ArrowUpRight className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No transactions yet</p>
                  <p className="text-sm">Add your first transaction to see it here</p>
                </div>
              ) : (
                recentTransactions.slice(0, 5).map((transaction) => {
                  const IconComponent = getTransactionIcon(transaction.type);
                  const isIncome = transaction.type === 'income';
                  return (
                    <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          isIncome ? "bg-success/10" : "bg-destructive/10"
                        )}>
                          <IconComponent className={cn(
                            "w-4 h-4",
                            isIncome ? "text-success" : "text-destructive"
                          )} />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(transaction.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "font-semibold text-sm",
                          isIncome ? "text-success" : "text-destructive"
                        )}>
                          {isIncome ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Budget Overview */}
        {budgets.length > 0 && (
          <Card className="card-elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Budget Overview</CardTitle>
                  <CardDescription>Track your spending against budgets</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Budget
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {budgets.slice(0, 3).map((budget) => {
                  const spent = 0; // TODO: Calculate actual spent amount
                  const progress = (spent / budget.amount) * 100;
                  const isOverBudget = progress > 100;
                  
                  return (
                    <div key={budget.id} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{budget.name}</h4>
                        <Badge variant={isOverBudget ? "destructive" : "secondary"}>
                          {budget.period}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Spent: {formatCurrency(spent)}</span>
                          <span>Budget: {formatCurrency(budget.amount)}</span>
                        </div>
                        <Progress 
                          value={Math.min(progress, 100)} 
                          className={cn(
                            "h-2",
                            isOverBudget && "bg-destructive/20"
                          )}
                        />
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(budget.amount - spent)} remaining
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common financial tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
                <Plus className="w-6 h-6 text-brand-primary" />
                <span className="text-sm">Add Transaction</span>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
                <CreditCard className="w-6 h-6 text-brand-secondary" />
                <span className="text-sm">Add Account</span>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
                <PiggyBank className="w-6 h-6 text-brand-accent" />
                <span className="text-sm">Create Budget</span>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
                <TrendingUp className="w-6 h-6 text-success" />
                <span className="text-sm">View Reports</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Finances;