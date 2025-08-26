import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search,
  ArrowLeft,
  Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFamily } from '@/hooks/useFamily';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  created_at: string;
  notes?: string;
  transaction_categories?: {
    name: string;
    color: string;
    icon: string;
  };
  financial_accounts?: {
    name: string;
    type: string;
  };
}

const AllTransactions = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentFamily } = useFamily();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    type: 'all', // 'all', 'income', 'expense'
    dateRange: 'all', // 'all', 'today', 'week', 'month', 'year'
    categories: [] as string[], // array of category IDs
    accounts: [] as string[], // array of account IDs
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const getTransactionIcon = (type: string) => {
    return type === 'income' ? ArrowUpRight : ArrowDownLeft;
  };

  const isTransactionInDateRange = (transaction: Transaction, range: string) => {
    const transactionDate = new Date(transaction.created_at);
    const now = new Date();
    
    switch (range) {
      case 'today':
        return transactionDate.toDateString() === now.toDateString();
      case 'week': {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return transactionDate >= weekAgo;
      }
      case 'month':
        return transactionDate.getMonth() === now.getMonth() && 
               transactionDate.getFullYear() === now.getFullYear();
      case 'year':
        return transactionDate.getFullYear() === now.getFullYear();
      default:
        return true;
    }
  };

  const applyFilters = (transaction: Transaction) => {
    // Type filter
    if (filters.type !== 'all' && transaction.type !== filters.type) {
      return false;
    }
    
    // Date range filter
    if (filters.dateRange !== 'all' && !isTransactionInDateRange(transaction, filters.dateRange)) {
      return false;
    }
    
    // Category filter
    if (filters.categories.length > 0 && 
        (!transaction.transaction_categories || !filters.categories.includes(transaction.transaction_categories.name))) {
      return false;
    }
    
    // Account filter
    if (filters.accounts.length > 0 && 
        (!transaction.financial_accounts || !filters.accounts.includes(transaction.financial_accounts.name))) {
      return false;
    }
    
    return true;
  };

  useEffect(() => {
    const fetchAllTransactions = async () => {
      if (!user || !currentFamily) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('transactions')
          .select(`
            *,
            transaction_categories (
              name,
              color,
              icon,
              type
            ),
            financial_accounts (
              name,
              type
            )
          `)
          .eq('family_id', currentFamily.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTransactions(data || []);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllTransactions();
  }, [user, currentFamily]);

  const filteredTransactions = transactions.filter(transaction => {
    // Apply advanced filters first
    if (!applyFilters(transaction)) {
      return false;
    }
    
    // Then apply search filter if there's a search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      const description = transaction.description?.toLowerCase() || '';
      const categoryName = transaction.transaction_categories?.name?.toLowerCase() || '';
      const accountName = transaction.financial_accounts?.name?.toLowerCase() || '';
      
      return description.includes(searchLower) || 
             categoryName.includes(searchLower) ||
             accountName.includes(searchLower);
    }
    
    return true;
  });

  // Get unique categories and accounts for filter options
  const uniqueCategories = Array.from(new Set(
    transactions
      .filter(t => t.transaction_categories)
      .map(t => t.transaction_categories!.name)
  ));

  const uniqueAccounts = Array.from(new Set(
    transactions
      .filter(t => t.financial_accounts)
      .map(t => t.financial_accounts!.name)
  ));

  const clearFilters = () => {
    setFilters({
      type: 'all',
      dateRange: 'all',
      categories: [],
      accounts: [],
    });
  };

  const hasActiveFilters = filters.type !== 'all' || 
                          filters.dateRange !== 'all' || 
                          filters.categories.length > 0 || 
                          filters.accounts.length > 0;

  if (!currentFamily) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">No family selected</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/finances')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back')}
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{t('finance.allTransactions')}</h1>
              <p className="text-text-secondary mt-1">
                {t('finance.allTransactionsDescription')}
              </p>
            </div>
          </div>
          
          {/* Search and Filters */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('finance.searchTransactions')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  {t('common.filter')}
                  {hasActiveFilters && (
                    <span className="ml-2 px-1.5 py-0.5 bg-brand-primary text-white text-xs rounded-full">
                      •
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{t('finance.filterOptions')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Type Filter */}
                <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                  {t('finance.transactionType')}
                </DropdownMenuLabel>
                <DropdownMenuCheckboxItem
                  checked={filters.type === 'all'}
                  onCheckedChange={() => setFilters(prev => ({ ...prev, type: 'all' }))}
                >
                  {t('finance.allTypes')}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.type === 'income'}
                  onCheckedChange={() => setFilters(prev => ({ ...prev, type: 'income' }))}
                >
                  {t('finance.income')}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.type === 'expense'}
                  onCheckedChange={() => setFilters(prev => ({ ...prev, type: 'expense' }))}
                >
                  {t('finance.expense')}
                </DropdownMenuCheckboxItem>
                
                <DropdownMenuSeparator />
                
                {/* Date Range Filter */}
                <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                  {t('finance.dateRange')}
                </DropdownMenuLabel>
                <DropdownMenuCheckboxItem
                  checked={filters.dateRange === 'all'}
                  onCheckedChange={() => setFilters(prev => ({ ...prev, dateRange: 'all' }))}
                >
                  {t('finance.allTime')}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.dateRange === 'today'}
                  onCheckedChange={() => setFilters(prev => ({ ...prev, dateRange: 'today' }))}
                >
                  {t('finance.today')}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.dateRange === 'week'}
                  onCheckedChange={() => setFilters(prev => ({ ...prev, dateRange: 'week' }))}
                >
                  {t('finance.thisWeek')}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.dateRange === 'month'}
                  onCheckedChange={() => setFilters(prev => ({ ...prev, dateRange: 'month' }))}
                >
                  {t('finance.thisMonth')}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.dateRange === 'year'}
                  onCheckedChange={() => setFilters(prev => ({ ...prev, dateRange: 'year' }))}
                >
                  {t('finance.thisYear')}
                </DropdownMenuCheckboxItem>
                
                {hasActiveFilters && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={clearFilters}>
                      {t('finance.clearFilters')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Transactions List */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>
              {t('finance.transactions')} ({filteredTransactions.length}{searchTerm.trim() ? ` de ${transactions.length}` : ''})
            </CardTitle>
            <CardDescription>
              {searchTerm ? t('finance.searchResults') : t('finance.allTransactionsInFamily')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg"></div>
                ))}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ArrowUpRight className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{searchTerm ? t('finance.noSearchResults') : t('finance.noTransactionsYet')}</p>
                <p className="text-sm mt-2">
                  {searchTerm ? t('finance.tryDifferentSearch') : t('finance.addFirstTransactionToSeeHere')}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTransactions.map((transaction) => {
                  const IconComponent = getTransactionIcon(transaction.type);
                  const isIncome = transaction.type === 'income';
                  return (
                    <div 
                      key={transaction.id} 
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          isIncome ? "bg-success/10" : "bg-destructive/10"
                        )}>
                          <IconComponent className={cn(
                            "w-5 h-5",
                            isIncome ? "text-success" : "text-destructive"
                          )} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium">{transaction.description}</p>
                            {transaction.transaction_categories && (
                              <span 
                                className="text-xs px-2 py-1 rounded-full text-white"
                                style={{ backgroundColor: transaction.transaction_categories.color }}
                              >
                                {transaction.transaction_categories.name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                            <span>
                              {new Date(transaction.created_at).toLocaleDateString()} {' '}
                              {new Date(transaction.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                            {transaction.financial_accounts && (
                              <span>{transaction.financial_accounts.name}</span>
                            )}
                          </div>
                          {transaction.notes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {transaction.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "font-semibold text-lg",
                          isIncome ? "text-success" : "text-destructive"
                        )}>
                          {isIncome ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AllTransactions;