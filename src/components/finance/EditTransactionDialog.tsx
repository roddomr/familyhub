import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CalendarIcon, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useFamily } from '@/hooks/useFamily';
import { useLogger } from '@/hooks/useLogger';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { LoadingButton } from '@/components/ui/loading-states';
import { EnhancedInput, EnhancedTextarea, useValidation, validateRequired, validateAmount } from '@/components/ui/form-field';
import { useEnhancedToast } from '@/hooks/useEnhancedToast';

interface EditTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  onTransactionUpdated?: () => void;
  onTransactionDeleted?: () => void;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  notes?: string;
  account_id: string;
  category_id?: string;
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

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
}

interface Category {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string;
}

export const EditTransactionDialog: React.FC<EditTransactionDialogProps> = ({
  open,
  onOpenChange,
  transaction,
  onTransactionUpdated,
  onTransactionDeleted
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentFamily } = useFamily();
  const { logInfo, logError } = useLogger();
  const toast = useEnhancedToast();

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'expense' as 'income' | 'expense',
    date: new Date(),
    accountId: '',
    categoryId: 'no-category',
    notes: ''
  });

  const validation = useValidation();

  // Load data when dialog opens or transaction changes
  useEffect(() => {
    if (open && currentFamily) {
      loadAccountsAndCategories();
    }
    
    if (transaction) {
      setFormData({
        description: transaction.description || '',
        amount: transaction.amount.toString(),
        type: transaction.type,
        date: new Date(transaction.date),
        accountId: transaction.account_id || '',
        categoryId: transaction.category_id || 'no-category',
        notes: transaction.notes || ''
      });
      validation.clearErrors();
    }
  }, [open, currentFamily, transaction]);

  const loadAccountsAndCategories = async () => {
    if (!currentFamily) return;

    try {
      const [accountsResult, categoriesResult] = await Promise.all([
        supabase
          .from('financial_accounts')
          .select('*')
          .eq('family_id', currentFamily.id)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('transaction_categories')
          .select('*')
          .eq('family_id', currentFamily.id)
          .order('name')
      ]);

      if (accountsResult.data) setAccounts(accountsResult.data);
      if (categoriesResult.data) setCategories(categoriesResult.data);
    } catch (error) {
      console.error('Error loading accounts and categories:', error);
      toast.apiError(error, 'loading accounts and categories');
    }
  };

  const resetForm = () => {
    setFormData({
      description: '',
      amount: '',
      type: 'expense',
      date: new Date(),
      accountId: '',
      categoryId: 'no-category',
      notes: ''
    });
    validation.clearErrors();
  };

  const validateForm = () => {
    let isValid = true;
    
    // Validate description
    if (!formData.description.trim()) {
      validation.setError('description', 'Description is required');
      isValid = false;
    } else {
      validation.setError('description', '');
    }
    
    // Validate amount
    const amountError = validateAmount(formData.amount);
    validation.setError('amount', amountError);
    if (amountError) isValid = false;
    
    // Validate account
    if (!formData.accountId) {
      validation.setError('accountId', 'Account is required');
      isValid = false;
    } else {
      validation.setError('accountId', '');
    }
    
    return isValid;
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !user || !currentFamily || !transaction) {
      return;
    }

    setLoading(true);
    
    try {
      await logInfo('Updating transaction', {
        family_id: currentFamily.id,
        transaction_id: transaction.id,
        description: formData.description,
        amount: formData.amount,
        type: formData.type
      }, 'finance', 'transaction-update');

      const { error } = await supabase
        .from('transactions')
        .update({
          description: formData.description.trim(),
          amount: parseFloat(formData.amount),
          type: formData.type,
          date: formData.date.toISOString().split('T')[0],
          account_id: formData.accountId,
          category_id: formData.categoryId === 'no-category' ? null : formData.categoryId,
          notes: formData.notes.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.id)
        .eq('family_id', currentFamily.id);

      if (error) throw error;

      // Update account balance if amount or account changed
      const amountDifference = parseFloat(formData.amount) - transaction.amount;
      const accountChanged = formData.accountId !== transaction.account_id;

      if (amountDifference !== 0 || accountChanged) {
        if (accountChanged) {
          // Get balances for both accounts
          const { data: accounts, error: accountsError } = await supabase
            .from('financial_accounts')
            .select('id, balance')
            .in('id', [transaction.account_id, formData.accountId]);

          if (accountsError) throw accountsError;

          const oldAccount = accounts.find(acc => acc.id === transaction.account_id);
          const newAccount = accounts.find(acc => acc.id === formData.accountId);

          if (!oldAccount || !newAccount) throw new Error('Account not found');

          // Calculate new balances
          const revertAmount = transaction.type === 'income' ? -transaction.amount : transaction.amount;
          const newOldBalance = (oldAccount.balance || 0) + revertAmount;

          const newAccountAmount = formData.type === 'income' ? parseFloat(formData.amount) : -parseFloat(formData.amount);
          const newNewBalance = (newAccount.balance || 0) + newAccountAmount;

          // Update both accounts
          const updates = [
            supabase
              .from('financial_accounts')
              .update({ 
                balance: newOldBalance,
                updated_at: new Date().toISOString()
              })
              .eq('id', transaction.account_id),
            supabase
              .from('financial_accounts')
              .update({ 
                balance: newNewBalance,
                updated_at: new Date().toISOString()
              })
              .eq('id', formData.accountId)
          ];

          const results = await Promise.all(updates);
          const errors = results.filter(result => result.error);
          if (errors.length > 0) throw errors[0].error;

        } else {
          // Same account, just update the difference
          const { data: accountData, error: accountError } = await supabase
            .from('financial_accounts')
            .select('balance')
            .eq('id', formData.accountId)
            .single();

          if (accountError) throw accountError;

          const balanceChange = formData.type === 'income' ? amountDifference : -amountDifference;
          const newBalance = (accountData.balance || 0) + balanceChange;

          const { error: updateError } = await supabase
            .from('financial_accounts')
            .update({ 
              balance: newBalance,
              updated_at: new Date().toISOString()
            })
            .eq('id', formData.accountId);

          if (updateError) throw updateError;
        }
      }

      await logInfo('Transaction updated successfully', {
        family_id: currentFamily.id,
        transaction_id: transaction.id
      }, 'finance', 'transaction-update');

      toast.success({ 
        title: t('finance.transactionUpdatedSuccessfully'),
        description: t('finance.transactionUpdatedDescription')
      });

      onOpenChange(false);
      onTransactionUpdated?.();

    } catch (error: any) {
      console.error('Error updating transaction:', error);
      
      await logError('Failed to update transaction', error, {
        family_id: currentFamily?.id,
        transaction_id: transaction?.id,
        form_data: formData
      }, 'finance', 'transaction-update');

      toast.apiError(error, 'updating transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !currentFamily || !transaction) return;

    setDeleting(true);
    
    try {
      await logInfo('Deleting transaction', {
        family_id: currentFamily.id,
        transaction_id: transaction.id
      }, 'finance', 'transaction-delete');

      // Get current account balance
      const { data: accountData, error: accountError } = await supabase
        .from('financial_accounts')
        .select('balance')
        .eq('id', transaction.account_id)
        .single();

      if (accountError) throw accountError;

      // Calculate new balance (revert the transaction effect)
      const balanceChange = transaction.type === 'income' ? -transaction.amount : transaction.amount;
      const newBalance = (accountData.balance || 0) + balanceChange;

      // Update account balance
      const { error: updateError } = await supabase
        .from('financial_accounts')
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.account_id);

      if (updateError) throw updateError;

      // Delete transaction
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transaction.id)
        .eq('family_id', currentFamily.id);

      if (error) throw error;

      await logInfo('Transaction deleted successfully', {
        family_id: currentFamily.id,
        transaction_id: transaction.id
      }, 'finance', 'transaction-delete');

      toast.success({ 
        title: t('finance.transactionDeletedSuccessfully'),
        description: t('finance.transactionDeletedDescription')
      });

      onOpenChange(false);
      onTransactionDeleted?.();

    } catch (error: any) {
      console.error('Error deleting transaction:', error);
      
      await logError('Failed to delete transaction', error, {
        family_id: currentFamily?.id,
        transaction_id: transaction?.id
      }, 'finance', 'transaction-delete');

      toast.apiError(error, 'deleting transaction');
    } finally {
      setDeleting(false);
    }
  };

  const filteredCategories = categories.filter(cat => cat.type === formData.type);

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-brand-primary" />
            {t('finance.editTransaction')}
          </DialogTitle>
          <DialogDescription>
            {t('finance.editTransactionDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleUpdate} className="space-y-4">
          {/* Transaction Type */}
          <div className="space-y-2">
            <Label htmlFor="transaction-type">{t('finance.transactionType')}</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value: 'income' | 'expense') => {
                setFormData(prev => ({ ...prev, type: value, categoryId: '' }));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">{t('finance.expense')}</SelectItem>
                <SelectItem value="income">{t('finance.income')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="transaction-description">{t('finance.description')}</Label>
            <EnhancedInput
              id="transaction-description"
              placeholder={t('finance.descriptionPlaceholder')}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              error={validation.errors.description}
              onBlur={() => {
                if (!formData.description.trim()) {
                  validation.setError('description', 'Description is required');
                } else {
                  validation.setError('description', '');
                }
              }}
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="transaction-amount">{t('finance.amount')}</Label>
            <EnhancedInput
              id="transaction-amount"
              type="number"
              step="0.01"
              min="0"
              placeholder={t('finance.amountPlaceholder')}
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              error={validation.errors.amount}
              onBlur={() => {
                const amountError = validateAmount(formData.amount);
                validation.setError('amount', amountError);
              }}
            />
          </div>

          {/* Account */}
          <div className="space-y-2">
            <Label htmlFor="transaction-account">{t('finance.account')}</Label>
            <Select 
              value={formData.accountId} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, accountId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('finance.selectAccount')} />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(account => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} ({account.type.replace('_', ' ')})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {validation.errors.accountId && (
              <p className="text-sm text-destructive">{validation.errors.accountId}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="transaction-category">{t('finance.category')} ({t('finance.optional')})</Label>
            <Select 
              value={formData.categoryId} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('finance.selectCategory')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-category">{t('finance.noCategory')}</SelectItem>
                {filteredCategories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>{t('finance.date')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date ? format(formData.date, 'PPP') : t('finance.selectDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => date && setFormData(prev => ({ ...prev, date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="transaction-notes">{t('finance.notes')} ({t('finance.optional')})</Label>
            <EnhancedTextarea
              id="transaction-notes"
              placeholder={t('finance.notesPlaceholder')}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          <DialogFooter className="flex justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="sm" disabled={loading || deleting}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('common.delete')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('finance.deleteTransaction')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('finance.deleteTransactionConfirmation')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground"
                    disabled={deleting}
                  >
                    {deleting ? t('common.deleting') : t('common.delete')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading || deleting}
              >
                {t('common.cancel')}
              </Button>
              <LoadingButton
                type="submit"
                loading={loading}
                disabled={deleting}
              >
                {t('finance.updateTransaction')}
              </LoadingButton>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTransactionDialog;