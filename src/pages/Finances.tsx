import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import CreateFamilyDialog from '@/components/family/CreateFamilyDialog';
import AddTransactionDialog from '@/components/finance/AddTransactionDialog';
import AddAccountDialog from '@/components/finance/AddAccountDialog';
import CreateBudgetDialog from '@/components/finance/CreateBudgetDialog';
import BudgetList from '@/components/finance/BudgetList';
import BudgetAlerts from '@/components/finance/BudgetAlerts';
import RecurringTransactionsManager from '@/components/finance/RecurringTransactionsManager';
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
  EyeOff,
  Target,
  Repeat
} from 'lucide-react';
import { useFinances } from '@/hooks/useFinances';
import { useFamily } from '@/hooks/useFamily';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const Finances = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showBalances, setShowBalances] = useState(true);
  const [showCreateFamily, setShowCreateFamily] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showCreateBudget, setShowCreateBudget] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const { 
    accounts, 
    recentTransactions, 
    budgets, 
    totalBalance, 
    monthlyIncome, 
    monthlyExpenses,
    loading,
    error,
    refreshData
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
              <h1 className="text-3xl font-bold">{t('finance.title')}</h1>
              <p className="text-text-secondary mt-1">{t('finance.loadingFinancialOverview')}</p>
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
            <h2 className="text-2xl font-bold">{t('finance.welcomeToFamilyHub')}</h2>
            <p className="text-muted-foreground">{t('finance.createOrJoinFamily')}</p>
            <Button onClick={() => setShowCreateFamily(true)}>
              {t('finance.createYourFirstFamily')}
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
            <h1 className="text-3xl font-bold">{t('finance.title')}</h1>
            <p className="text-text-secondary mt-1">
              {t('finance.manageFinancialHealth', { familyName: currentFamily.name })}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBalances(!showBalances)}
            >
              {showBalances ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showBalances ? t('finance.hideBalances') : t('finance.showBalances')}
            </Button>
            <Button 
              variant={activeTab === 'recurring' ? 'default' : 'outline'}
              onClick={() => setActiveTab(activeTab === 'recurring' ? 'overview' : 'recurring')}
            >
              <Repeat className="w-4 h-4 mr-2" />
{t('finance.recurringTransactions')}
            </Button>
            <Button onClick={() => setShowAddTransaction(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('finance.addTransaction')}
            </Button>
          </div>
        </div>

        {/* Conditional Content Based on Active Tab */}
        {activeTab === 'recurring' ? (
          <RecurringTransactionsManager />
        ) : (
          <>
            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="card-elevated">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">{t('finance.totalBalance')}</p>
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
                  <p className="text-sm font-medium text-text-secondary">{t('finance.monthlyIncome')}</p>
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
                  <p className="text-sm font-medium text-text-secondary">{t('finance.monthlyExpenses')}</p>
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
                  <CardTitle>{t('finance.accounts')}</CardTitle>
                  <CardDescription>{t('finance.yourFinancialAccountsOverview')}</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAddAccount(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('finance.addAccount')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {accounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{t('finance.noAccountsAdded')}</p>
                  <p className="text-sm">{t('finance.addFirstAccountToGetStarted')}</p>
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
                  <CardTitle>{t('finance.recentTransactions')}</CardTitle>
                  <CardDescription>{t('finance.yourLatestFinancialActivity')}</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/finances/transactions')}
                >
                  {t('finance.viewAll')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ArrowUpRight className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{t('finance.noTransactionsYet')}</p>
                  <p className="text-sm">{t('finance.addFirstTransactionToSeeHere')}</p>
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
                            {new Date(transaction.created_at).toLocaleDateString()} {new Date(transaction.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "font-semibold text-sm",
                          isIncome ? "text-success" : "text-destructive"
                        )}>
                          {showBalances ? (
                            `${isIncome ? '+' : '-'}${formatCurrency(Math.abs(transaction.amount))}`
                          ) : (
                            '••••••'
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Budget Alerts */}
        <BudgetAlerts budgets={budgets} />
        
        {/* Budget Overview */}
        <Card className="card-elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('finance.budgetOverview')}</CardTitle>
                <CardDescription>{t('finance.budgetOverviewDescription')}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {budgets.length > 3 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate('/finances/budgets')}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {t('finance.viewAllBudgets')}
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowCreateBudget(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('finance.createBudget')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {budgets.length === 0 ? (
              <div className="text-center py-12">
                <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  {t('finance.noBudgetsYet')}
                </p>
                <Button onClick={() => setShowCreateBudget(true)}>
                  {t('finance.createFirstBudget')}
                </Button>
              </div>
            ) : (
              <BudgetList 
                budgets={budgets.slice(0, 3)}
                onBudgetChange={refreshData}
                showCreateButton={false}
                showHeader={false}
              />
            )}
            
            {budgets.length > 3 && (
              <div className="mt-6 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{t('finance.showingFirst3Budgets', { total: budgets.length })}</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigate('/finances/budgets')}
                    className="text-brand-primary hover:text-brand-primary"
                  >
                    {t('finance.viewAllBudgets')} 
                    <ArrowUpRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>{t('finance.quickActions')}</CardTitle>
            <CardDescription>{t('finance.commonFinancialTasks')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="h-auto p-4 flex-col space-y-2"
                onClick={() => setShowAddTransaction(true)}
              >
                <Plus className="w-6 h-6 text-brand-primary" />
                <span className="text-sm">{t('finance.addTransaction')}</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 flex-col space-y-2"
                onClick={() => setShowAddAccount(true)}
              >
                <CreditCard className="w-6 h-6 text-brand-secondary" />
                <span className="text-sm">{t('finance.addAccount')}</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 flex-col space-y-2"
                onClick={() => setShowCreateBudget(true)}
              >
                <PiggyBank className="w-6 h-6 text-brand-accent" />
                <span className="text-sm">{t('finance.createBudget')}</span>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex-col space-y-2">
                <TrendingUp className="w-6 h-6 text-success" />
                <span className="text-sm">{t('finance.viewReports')}</span>
              </Button>
            </div>
          </CardContent>
        </Card>

            {/* Overview content ends here */}
          </>
        )}

        {/* Dialogs - Always rendered regardless of tab */}
        <AddTransactionDialog
          open={showAddTransaction}
          onOpenChange={setShowAddTransaction}
          onTransactionAdded={() => {
            // Refresh financial data when transaction is added
            refreshData();
          }}
        />

        <AddAccountDialog
          open={showAddAccount}
          onOpenChange={setShowAddAccount}
          onAccountAdded={() => {
            // Refresh financial data when account is added
            refreshData();
          }}
        />

        <CreateBudgetDialog
          open={showCreateBudget}
          onOpenChange={setShowCreateBudget}
          onBudgetCreated={() => {
            // Refresh financial data when budget is created
            refreshData();
          }}
        />
      </div>
    </DashboardLayout>
  );
};

export default Finances;