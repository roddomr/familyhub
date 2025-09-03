import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Repeat,
  Plus,
  Pause,
  Edit,
  Trash,
  MoreHorizontal,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { useRecurringTransactions } from '@/hooks/useRecurringTransactions';
import { useEnhancedToast } from '@/hooks/useEnhancedToast';
import { useTranslation } from 'react-i18next';
import CreateRecurringTransactionDialog from './CreateRecurringTransactionDialog';
import { RecurringTransaction, UpcomingRecurringTransaction, RecurringTransactionExecution } from '@/types/recurring';
import { cn } from '@/lib/utils';

interface RecurringTransactionsManagerProps {
  className?: string;
}

const RecurringTransactionsManager: React.FC<RecurringTransactionsManagerProps> = ({
  className
}) => {
  const { t } = useTranslation();
  const toast = useEnhancedToast();
  const {
    recurringTransactions,
    upcomingTransactions,
    executions,
    loading,
    error,
    fetchRecurringTransactions,
    fetchUpcomingTransactions,
    fetchExecutionHistory,
    toggleRecurringTransaction,
    deleteRecurringTransaction
  } = useRecurringTransactions();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedRecurringId, setSelectedRecurringId] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      toast.error({
        title: 'Error',
        description: error
      });
    }
  }, [error, toast]);

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const success = await toggleRecurringTransaction(id, !currentStatus);
    if (success) {
      toast.success({
        title: 'Success',
        description: `Recurring transaction ${!currentStatus ? 'activated' : 'deactivated'}`
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this recurring transaction? This action cannot be undone.')) {
      const success = await deleteRecurringTransaction(id);
      if (success) {
        toast.success({
          title: 'Success',
          description: 'Recurring transaction deleted'
        });
      }
    }
  };


  const getFrequencyLabel = (frequency: string, intervalCount: number) => {
    const base = frequency === 'daily' ? 'day' :
                 frequency === 'weekly' ? 'week' :
                 frequency === 'monthly' ? 'month' :
                 frequency === 'quarterly' ? 'quarter' :
                 frequency === 'yearly' ? 'year' : frequency;
    
    if (intervalCount === 1) {
      return `Every ${base}`;
    }
    return `Every ${intervalCount} ${base}s`;
  };

  const getStatusBadge = (isActive: boolean, nextDate: string) => {
    if (!isActive) {
      return <Badge variant="secondary">{t('finance.inactive')}</Badge>;
    }
    
    const next = new Date(nextDate);
    const today = new Date();
    const isOverdue = next < today;
    
    if (isOverdue) {
      return <Badge variant="destructive">{t('finance.overdue')}</Badge>;
    }
    
    return <Badge variant="default">{t('finance.active')}</Badge>;
  };

  const getExecutionStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />{t('finance.completed')}</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />{t('finance.failed')}</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Calendar className="w-3 h-3 mr-1" />{t('finance.pending')}</Badge>;
      case 'skipped':
        return <Badge variant="outline">{t('finance.skipped')}</Badge>;
      case 'cancelled':
        return <Badge variant="outline">{t('finance.cancelled')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Repeat className="w-6 h-6 text-blue-600" />
              <div>
                <CardTitle>{t('finance.recurringTransactions')}</CardTitle>
                <CardDescription>
                  {t('finance.manageRecurringTransactions')}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
{t('finance.newRecurringTransaction')}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="recurring" className="space-y-6">
        <TabsList>
          <TabsTrigger value="recurring">{t('finance.recurringTransactions')}</TabsTrigger>
          <TabsTrigger value="upcoming">{t('finance.upcoming')}</TabsTrigger>
          <TabsTrigger value="history">{t('finance.executionHistory')}</TabsTrigger>
        </TabsList>

        {/* Recurring Transactions Tab */}
        <TabsContent value="recurring">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('finance.activeRecurringTransactions')}</CardTitle>
              <CardDescription>
                {recurringTransactions.length} {recurringTransactions.length === 1 ? t('finance.recurringTransactionsConfigured') : t('finance.recurringTransactionsConfiguredPlural')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recurringTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <Repeat className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{t('finance.noRecurringTransactions')}</h3>
                  <p className="text-muted-foreground mb-4">
                    {t('finance.setupAutomaticRecurringTransactions')}
                  </p>
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
{t('finance.createYourFirstRecurringTransaction')}
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common.description')}</TableHead>
                      <TableHead>{t('common.amount')}</TableHead>
                      <TableHead>{t('finance.frequency')}</TableHead>
                      <TableHead>{t('finance.nextDate')}</TableHead>
                      <TableHead>{t('finance.account')}</TableHead>
                      <TableHead>{t('finance.status')}</TableHead>
                      <TableHead>{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recurringTransactions.map((rt) => (
                      <TableRow key={rt.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className={cn(
                              "w-3 h-3 rounded-full",
                              rt.category?.color ? '' : 'bg-gray-400'
                            )} style={{ backgroundColor: rt.category?.color }} />
                            <div>
                              <p className="font-medium">{rt.description}</p>
                              {rt.category && (
                                <p className="text-sm text-muted-foreground">{rt.category.name}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <span className={cn(
                              "font-medium",
                              rt.type === 'income' ? 'text-green-600' : 'text-red-600'
                            )}>
                              {rt.type === 'income' ? '+' : '-'}${rt.amount.toFixed(2)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{getFrequencyLabel(rt.frequency, rt.interval_count)}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">
                              {format(new Date(rt.next_execution_date), 'MMM dd, yyyy')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{rt.account?.name}</span>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(rt.is_active, rt.next_execution_date)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleToggleActive(rt.id, rt.is_active)}
                              >
                                {rt.is_active ? (
                                  <>
                                    <Pause className="w-4 h-4 mr-2" />
                                    {t('finance.deactivate')}
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-4 h-4 mr-2" />
                                    {t('finance.activate')}
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedRecurringId(rt.id);
                                  fetchExecutionHistory(rt.id);
                                }}
                              >
                                <Calendar className="w-4 h-4 mr-2" />
                                {t('finance.viewHistory')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(rt.id)}
                                className="text-red-600"
                              >
                                <Trash className="w-4 h-4 mr-2" />
                                {t('common.delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upcoming Transactions Tab */}
        <TabsContent value="upcoming">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('finance.upcoming')} {t('finance.transactions')}</CardTitle>
              <CardDescription>
                {t('finance.next30DaysScheduled')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{t('finance.noUpcomingTransactions')}</h3>
                  <p className="text-muted-foreground">
                    {t('finance.noRecurringTransactionsScheduled')}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common.date')}</TableHead>
                      <TableHead>{t('common.description')}</TableHead>
                      <TableHead>{t('common.amount')}</TableHead>
                      <TableHead>{t('finance.account')}</TableHead>
                      <TableHead>{t('finance.frequency')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingTransactions.map((ut, index) => (
                      <TableRow key={`${ut.recurring_transaction_id}-${ut.next_date}`}>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {format(new Date(ut.next_date), 'MMM dd, yyyy')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            {ut.category_name && (
                              <div className="w-3 h-3 rounded-full bg-blue-500" />
                            )}
                            <div>
                              <p className="font-medium">{ut.description}</p>
                              {ut.category_name && (
                                <p className="text-sm text-muted-foreground">{ut.category_name}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "font-medium",
                            ut.type === 'income' ? 'text-green-600' : 'text-red-600'
                          )}>
                            {ut.type === 'income' ? '+' : '-'}${ut.amount.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{ut.account_name}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{ut.frequency}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Execution History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('finance.executionHistory')}</CardTitle>
              <CardDescription>
                {t('finance.recentRecurringTransactionExecutions')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {executions.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{t('finance.noExecutionHistory')}</h3>
                  <p className="text-muted-foreground">
                    {t('finance.executionHistoryWillAppear')}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('finance.scheduledDate')}</TableHead>
                      <TableHead>{t('finance.executedDate')}</TableHead>
                      <TableHead>{t('finance.status')}</TableHead>
                      <TableHead>{t('finance.transaction')}</TableHead>
                      <TableHead>{t('finance.error')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {executions.map((execution) => (
                      <TableRow key={execution.id}>
                        <TableCell>
                          <span className="text-sm">
                            {format(new Date(execution.scheduled_date), 'MMM dd, yyyy')}
                          </span>
                        </TableCell>
                        <TableCell>
                          {execution.executed_date ? (
                            <span className="text-sm">
                              {format(new Date(execution.executed_date), 'MMM dd, yyyy')}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getExecutionStatusBadge(execution.execution_status)}
                        </TableCell>
                        <TableCell>
                          {execution.transaction ? (
                            <div>
                              <p className="text-sm font-medium">{execution.transaction.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {execution.transaction.type === 'income' ? '+' : '-'}${execution.transaction.amount.toFixed(2)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {execution.error_message ? (
                            <div className="flex items-center space-x-1 text-red-600">
                              <AlertTriangle className="w-4 h-4" />
                              <span className="text-xs truncate max-w-xs" title={execution.error_message}>
                                {execution.error_message}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <CreateRecurringTransactionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onRecurringTransactionCreated={() => {
          // Force refresh after creating a new recurring transaction
          fetchRecurringTransactions(undefined, true);
          fetchUpcomingTransactions();
        }}
      />
    </div>
  );
};

export default RecurringTransactionsManager;