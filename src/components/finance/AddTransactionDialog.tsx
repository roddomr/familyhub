import React, { useState, useEffect, useCallback } from 'react';
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
import { CalendarIcon, Plus, Settings } from 'lucide-react';
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
import { useAuditLog } from '@/hooks/useAuditLog';
import { sanitizeAmount, sanitizeText } from '@/lib/security/validation';
import { SECURITY_THRESHOLDS } from '@/lib/security/encryption';
import { useCategories } from '@/hooks/useCategories';
import { CreateCategoryDialog } from './CreateCategoryDialog';
import { CategoryManager } from './CategoryManager';

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

const AddTransactionDialog = ({ open, onOpenChange, onTransactionAdded }: AddTransactionDialogProps) => {
  const { currentFamily } = useFamily();
  const { user } = useAuth();
  const { logInfo, logError } = useLogger();
  const { t } = useTranslation();
  const toast = useEnhancedToast();
  const { logTransaction, logSuspiciousActivity } = useAuditLog();
  const validation = useValidation();
  const { getFlatCategories, getCategoriesByType, loadCategories, loading: categoriesLoading } = useCategories();
  
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [date, setDate] = useState<Date>(new Date());
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'expense' as 'income' | 'expense',
    accountId: '',
    categoryId: '',
    notes: '',
  });

  // Load accounts when dialog opens
  useEffect(() => {
    if (open && currentFamily) {
      loadAccounts();
    }
  }, [open, currentFamily]);

  const loadAccounts = async () => {
    if (!currentFamily) {
      await logError('Cannot load accounts: no current family', {}, 'finance', 'load_accounts', 'NO_FAMILY');
      return;
    }

    await logInfo('Loading accounts', {
      family_id: currentFamily.id
    }, 'finance', 'load_accounts');

    try {
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

      await logInfo('Successfully loaded accounts', {
        accounts_count: accountsData?.length || 0
      }, 'finance', 'load_accounts');

      setAccounts(accountsData || []);
    } catch (error: any) {
      await logError('Unexpected error loading accounts', {
        error: error.message,
        stack: error.stack
      }, 'finance', 'load_accounts', 'UNEXPECTED_ERROR', error.stack);
      console.error('Error loading accounts:', error);
      toast.apiError(error, 'loading accounts');
    }
  };

  // Get filtered categories based on transaction type
  const availableCategories = getCategoriesByType(formData.type);

  // Handle category creation completion
  const handleCategoryCreated = useCallback(() => {
    console.log('[DEBUG] Category created, reloading categories...');
    loadCategories(); // Refresh categories list
  }, [loadCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await logInfo('Transaction creation started', {
      family_id: currentFamily?.id,
      form_data: formData,
      date: format(date, 'yyyy-MM-dd'),
      accounts_available: accounts.length,
      categories_available: availableCategories.length
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
      // Sanitize inputs for security
      const sanitizedDescription = sanitizeText(formData.description);
      const sanitizedAmount = sanitizeAmount(formData.amount);
      const amount = sanitizedAmount;
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
          description: sanitizedDescription,
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

      // Security audit logging
      const createdTransaction = transactionData?.[0];
      if (createdTransaction) {
        await logTransaction('CREATE', {
          id: createdTransaction.id,
          description: sanitizedDescription,
          amount: amount,
          type: formData.type,
          account_id: formData.accountId,
          family_id: currentFamily.id,
          created_by: user.id
        });

        // Check for suspicious amounts
        if (amount > SECURITY_THRESHOLDS.LARGE_TRANSACTION) {
          await logSuspiciousActivity('large_transaction_created', {
            transaction_id: createdTransaction.id,
            amount: amount,
            threshold: SECURITY_THRESHOLDS.LARGE_TRANSACTION,
            account_id: formData.accountId
          });
          
          if (amount > SECURITY_THRESHOLDS.CRITICAL_TRANSACTION) {
            toast.warning({
              title: 'Large Transaction Alert',
              description: `Transaction of $${amount} exceeds normal threshold. This has been logged for security.`
            });
          }
        }
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

  // Helper function to render category hierarchy in dropdown
  const renderCategoryOption = (category: any, level = 0) => {
    const indentStyle = level > 0 ? { paddingLeft: `${level * 1.5}rem` } : {};
    return (
      <SelectItem key={category.id} value={category.id}>
        <div className="flex items-center gap-2" style={indentStyle}>
          <div 
            className="w-3 h-3 rounded-full flex-shrink-0" 
            style={{ backgroundColor: category.color }}
          />
          <span>{category.name}</span>
          {level > 0 && <span className="text-xs text-muted-foreground">↳</span>}
        </div>
      </SelectItem>
    );
  };

  const renderCategoryItems = (categories: any[]) => {
    const items: JSX.Element[] = [];
    categories.forEach(category => {
      items.push(renderCategoryOption(category, 0));
      if (category.subcategories && category.subcategories.length > 0) {
        category.subcategories.forEach((sub: any) => {
          items.push(renderCategoryOption(sub, 1));
        });
      }
    });
    return items;
  };

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
              <div className="flex items-center justify-between">
                <Label htmlFor="category">{t('finance.category')}</Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCreateCategoryOpen(true)}
                    className="h-6 px-2 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {t('finance.categories.create')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCategoryManagerOpen(true)}
                    className="h-6 px-2 text-xs"
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    {t('finance.categories.manage')}
                  </Button>
                </div>
              </div>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                disabled={categoriesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    categoriesLoading 
                      ? t('common.loading') 
                      : availableCategories.length === 0 
                        ? t('finance.categories.noCategories')
                        : t('finance.selectCategory')
                  } />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.length > 0 ? (
                    renderCategoryItems(availableCategories)
                  ) : (
                    <SelectItem value="no-categories" disabled>
                      {t('finance.categories.createFirst')}
                    </SelectItem>
                  )}
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

      {/* Create Category Dialog */}
      <CreateCategoryDialog
        open={createCategoryOpen}
        onOpenChange={setCreateCategoryOpen}
        defaultType={formData.type}
        onCategoryCreated={handleCategoryCreated}
      />

      {/* Category Manager Dialog */}
      <CategoryManager
        open={categoryManagerOpen}
        onOpenChange={setCategoryManagerOpen}
      />
    </Dialog>
  );
};

export default AddTransactionDialog;