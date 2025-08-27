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
import { CalendarIcon } from 'lucide-react';
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

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransactionAdded?: () => void;
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
  type: 'income' | 'expense';
  color: string;
}

const AddTransactionDialog = ({ open, onOpenChange, onTransactionAdded }: AddTransactionDialogProps) => {
  const { currentFamily } = useFamily();
  const { user } = useAuth();
  const { logInfo, logError } = useLogger();
  const { t } = useTranslation();
  const toast = useEnhancedToast();
  const validation = useValidation();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [date, setDate] = useState<Date>(new Date());

  // Form state
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'expense' as 'income' | 'expense',
    accountId: '',
    categoryId: '',
    notes: '',
  });

  // Load accounts and categories when dialog opens
  useEffect(() => {
    if (open && currentFamily) {
      loadAccountsAndCategories();
    }
  }, [open, currentFamily]);

  const loadAccountsAndCategories = async () => {
    if (!currentFamily) {
      await logError('Cannot load accounts/categories: no current family', {}, 'finance', 'load_data', 'NO_FAMILY');
      return;
    }

    await logInfo('Loading accounts and categories', {
      family_id: currentFamily.id
    }, 'finance', 'load_data');

    try {
      // Load accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('financial_accounts')
        .select('id, name, type, balance')
        .eq('family_id', currentFamily.id)
        .eq('is_active', true)
        .order('name');

      if (accountsError) {
        await logError('Error loading accounts', {
          error: accountsError.message,
          code: accountsError.code
        }, 'finance', 'load_accounts', 'DATABASE_ERROR');
        throw accountsError;
      }

      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('transaction_categories')
        .select('id, name, type, color')
        .eq('family_id', currentFamily.id)
        .order('name');

      if (categoriesError) {
        await logError('Error loading categories', {
          error: categoriesError.message,
          code: categoriesError.code
        }, 'finance', 'load_categories', 'DATABASE_ERROR');
        throw categoriesError;
      }

      await logInfo('Successfully loaded accounts and categories', {
        accounts_count: accountsData?.length || 0,
        categories_count: categoriesData?.length || 0
      }, 'finance', 'load_data');

      setAccounts(accountsData || []);
      setCategories(categoriesData || []);
    } catch (error: any) {
      await logError('Unexpected error loading data', {
        error: error.message,
        stack: error.stack
      }, 'finance', 'load_data', 'UNEXPECTED_ERROR', error.stack);
      console.error('Error loading accounts and categories:', error);
      toast.apiError(error, 'loading accounts and categories');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await logInfo('Transaction creation started', {
      family_id: currentFamily?.id,
      form_data: formData,
      date: format(date, 'yyyy-MM-dd'),
      accounts_available: accounts.length,
      categories_available: categories.length
    }, 'finance', 'create_transaction');

    if (!currentFamily || !user || !formData.description || !formData.amount || !formData.accountId) {
      await logError('Transaction creation failed: missing required fields', {
        has_family: !!currentFamily,
        has_user: !!user,
        form_data: formData,
        missing_fields: {
          description: !formData.description,
          amount: !formData.amount,
          account: !formData.accountId,
          user: !user
        }
      }, 'finance', 'create_transaction', 'VALIDATION_ERROR');
      toast.validationError({
        title: t('errors.validationError'),
        description: t('finance.fillRequired')
      });
      return;
    }

    setLoading(true);
    try {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        await logError('Transaction creation failed: invalid amount', {
          amount_input: formData.amount,
          parsed_amount: amount
        }, 'finance', 'create_transaction', 'INVALID_AMOUNT');
        toast.validationError({
          title: t('errors.validationError'),
          description: t('finance.validAmount')
        });
        setLoading(false);
        return;
      }

      await logInfo('Inserting transaction into database', {
        transaction_data: {
          family_id: currentFamily.id,
          account_id: formData.accountId,
          category_id: formData.categoryId,
          description: formData.description,
          amount: amount,
          type: formData.type,
          date: format(date, 'yyyy-MM-dd')
        }
      }, 'finance', 'create_transaction');

      // Insert transaction
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          family_id: currentFamily.id,
          account_id: formData.accountId,
          category_id: formData.categoryId || null,
          description: formData.description,
          amount: amount,
          type: formData.type,
          date: format(date, 'yyyy-MM-dd'),
          notes: formData.notes || null,
          created_by: user.id,
        })
        .select();

      if (transactionError) {
        await logError('Database error creating transaction', {
          error: transactionError.message,
          code: transactionError.code,
          details: transactionError.details
        }, 'finance', 'create_transaction', 'DATABASE_ERROR');
        throw transactionError;
      }

      await logInfo('Transaction created, updating account balance', {
        transaction_id: transactionData?.[0]?.id,
        balance_change: formData.type === 'income' ? amount : -amount
      }, 'finance', 'create_transaction');

      // Update account balance
      const balanceChange = formData.type === 'income' ? amount : -amount;
      const { error: balanceError } = await supabase.rpc('update_account_balance', {
        account_id: formData.accountId,
        amount_change: balanceChange
      });

      if (balanceError) {
        await logError('Failed to update account balance', {
          account_id: formData.accountId,
          balance_change: balanceChange,
          error: balanceError.message
        }, 'finance', 'update_balance', 'BALANCE_UPDATE_ERROR');
        console.warn('Failed to update account balance:', balanceError);
      } else {
        await logInfo('Account balance updated successfully', {
          account_id: formData.accountId,
          balance_change: balanceChange
        }, 'finance', 'update_balance');
      }

      await logInfo('Transaction created successfully', {
        transaction_id: transactionData?.[0]?.id,
        description: formData.description,
        amount: amount,
        type: formData.type
      }, 'finance', 'create_transaction');

      toast.success({
        title: t('common.success'),
        description: t('finance.transactionAdded')
      });
      
      // Reset form
      setFormData({
        description: '',
        amount: '',
        type: 'expense',
        accountId: '',
        categoryId: '',
        notes: '',
      });
      setDate(new Date());
      
      onTransactionAdded?.();
      onOpenChange(false);
    } catch (error: any) {
      await logError('Unexpected error creating transaction', {
        error: error.message,
        stack: error.stack
      }, 'finance', 'create_transaction', 'UNEXPECTED_ERROR', error.stack);
      console.error('Error adding transaction:', error);
      toast.apiError(error, 'creating transaction');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(cat => cat.type === formData.type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('finance.addTransactionTitle')}</DialogTitle>
          <DialogDescription>
            {t('finance.addTransactionDescription')}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Transaction Type */}
            <div className="grid gap-2">
              <Label htmlFor="type">{t('common.type')} *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'income' | 'expense') => {
                  setFormData({ ...formData, type: value, categoryId: '' });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('finance.selectType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">{t('finance.expense')}</SelectItem>
                  <SelectItem value="income">{t('finance.income')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">{t('common.description')} *</Label>
              <Input
                id="description"
                placeholder={t('finance.descriptionPlaceholder')}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            {/* Amount */}
            <div className="grid gap-2">
              <Label htmlFor="amount">{t('common.amount')} *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder={t('finance.amountPlaceholder')}
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>

            {/* Date */}
            <div className="grid gap-2">
              <Label>{t('common.date')} *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>{t('finance.pickDate')}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(date) => date && setDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Account */}
            <div className="grid gap-2">
              <Label htmlFor="account">{t('finance.account')} *</Label>
              <Select
                value={formData.accountId}
                onValueChange={(value) => setFormData({ ...formData, accountId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('finance.selectAccount')} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="grid gap-2">
              <Label htmlFor="category">{t('finance.category')}</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('finance.selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="notes">{t('common.notes')}</Label>
              <Textarea
                id="notes"
                placeholder={t('finance.notesPlaceholder')}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel')}
            </Button>
            <LoadingButton 
              type="submit" 
              loading={loading}
              loadingText={t('finance.adding')}
            >
              {t('finance.addTransaction')}
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTransactionDialog;