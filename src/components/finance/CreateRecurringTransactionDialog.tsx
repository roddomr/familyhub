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
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, Repeat } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useFamily } from '@/hooks/useFamily';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { LoadingButton } from '@/components/ui/loading-states';
import { useEnhancedToast } from '@/hooks/useEnhancedToast';
import { useRecurringTransactions } from '@/hooks/useRecurringTransactions';
import {
  CreateRecurringTransactionData,
  FREQUENCY_OPTIONS,
  DAYS_OF_WEEK,
  WEEKS_OF_MONTH,
  RecurrenceFrequency
} from '@/types/recurring';

interface CreateRecurringTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecurringTransactionCreated?: () => void;
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

const CreateRecurringTransactionDialog = ({ 
  open, 
  onOpenChange, 
  onRecurringTransactionCreated 
}: CreateRecurringTransactionDialogProps) => {
  const { currentFamily } = useFamily();
  const { user } = useAuth();
  const { t } = useTranslation();
  const toast = useEnhancedToast();
  const { createRecurringTransaction, loading } = useRecurringTransactions();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [useEndDate, setUseEndDate] = useState(false);
  const [useMaxOccurrences, setUseMaxOccurrences] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'expense' as 'income' | 'expense',
    accountId: '',
    categoryId: '',
    notes: '',
    frequency: 'monthly' as RecurrenceFrequency,
    intervalCount: 1,
    maxOccurrences: 12,
    
    // Weekly pattern
    daysOfWeek: [] as number[],
    
    // Monthly pattern
    dayOfMonth: new Date().getDate(),
    weekOfMonth: 1,
    dayOfWeek: new Date().getDay(),
    monthlyPattern: 'day' as 'day' | 'week' // day of month vs week of month
  });

  // Load accounts and categories when dialog opens
  useEffect(() => {
    if (open && currentFamily) {
      console.log('Loading accounts and categories for family:', currentFamily.id);
      loadAccountsAndCategories();
    }
  }, [open, currentFamily]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        description: '',
        amount: '',
        type: 'expense',
        accountId: '',
        categoryId: '',
        notes: '',
        frequency: 'monthly',
        intervalCount: 1,
        maxOccurrences: 12,
        daysOfWeek: [],
        dayOfMonth: new Date().getDate(),
        weekOfMonth: 1,
        dayOfWeek: new Date().getDay(),
        monthlyPattern: 'day'
      });
      setStartDate(new Date());
      setEndDate(undefined);
      setUseEndDate(false);
      setUseMaxOccurrences(false);
    }
  }, [open]);

  const loadAccountsAndCategories = async () => {
    if (!currentFamily) return;

    setLoadingAccounts(true);
    try {
      // Load accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('financial_accounts')
        .select('id, name, type, balance')
        .eq('family_id', currentFamily.id)
        .eq('is_active', true)
        .order('name');

      if (accountsError) throw accountsError;

      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('transaction_categories')
        .select('id, name, type, color')
        .eq('family_id', currentFamily.id)
        .order('name');

      if (categoriesError) throw categoriesError;

      console.log('Loaded accounts:', accountsData);
      console.log('Loaded categories:', categoriesData);
      
      setAccounts(accountsData || []);
      setCategories(categoriesData || []);
    } catch (error: any) {
      console.error('Error loading accounts and categories:', error);
      toast.apiError(error, 'loading accounts and categories');
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleWeekDayToggle = (dayValue: number, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      daysOfWeek: checked 
        ? [...prev.daysOfWeek, dayValue].sort()
        : prev.daysOfWeek.filter(d => d !== dayValue)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentFamily || !user) {
      toast.validationError({
        title: t('errors.validationError'),
        description: 'Missing family or user information'
      });
      return;
    }

    if (accounts.length === 0) {
      toast.validationError({
        title: 'No Accounts Available',
        description: 'Please create a financial account first before setting up recurring transactions'
      });
      return;
    }

    if (!formData.description || !formData.amount || !formData.accountId) {
      toast.validationError({
        title: t('errors.validationError'),
        description: 'Please fill in all required fields'
      });
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.validationError({
        title: t('errors.validationError'),
        description: 'Please enter a valid amount'
      });
      return;
    }

    // Validate frequency-specific patterns
    if (formData.frequency === 'weekly' && formData.daysOfWeek.length === 0) {
      toast.validationError({
        title: t('errors.validationError'),
        description: 'Please select at least one day of the week'
      });
      return;
    }

    const recurringData: CreateRecurringTransactionData = {
      account_id: formData.accountId,
      category_id: formData.categoryId || undefined,
      description: formData.description,
      amount: amount,
      type: formData.type,
      notes: formData.notes || undefined,
      frequency: formData.frequency,
      interval_count: formData.intervalCount,
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: useEndDate && endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
      max_occurrences: useMaxOccurrences ? formData.maxOccurrences : undefined,
    };

    // Add frequency-specific patterns
    if (formData.frequency === 'weekly') {
      recurringData.days_of_week = formData.daysOfWeek;
    } else if (formData.frequency === 'monthly') {
      if (formData.monthlyPattern === 'day') {
        recurringData.day_of_month = formData.dayOfMonth;
      } else {
        recurringData.week_of_month = formData.weekOfMonth;
        recurringData.day_of_week = formData.dayOfWeek;
      }
    }

    try {
      const result = await createRecurringTransaction(recurringData);
      
      if (result) {
        toast.success({
          title: t('common.success'),
          description: 'Recurring transaction created successfully'
        });
        
        onRecurringTransactionCreated?.();
        onOpenChange(false);
      }
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const filteredCategories = categories.filter(cat => cat.type === formData.type);
  const frequencyOption = FREQUENCY_OPTIONS.find(opt => opt.frequency === formData.frequency);

  // Helper function to get translated frequency options
  const getTranslatedFrequencyOptions = () => {
    return FREQUENCY_OPTIONS.map(option => ({
      ...option,
      label: t(`finance.${option.frequency}`),
      description: getFrequencyDescription(option.frequency)
    }));
  };

  // Helper to get frequency description
  const getFrequencyDescription = (freq: string) => {
    switch (freq) {
      case 'daily': return t('finance.everyDay');
      case 'weekly': return t('finance.everyWeek');
      case 'monthly': return t('finance.everyMonth');
      case 'quarterly': return t('finance.every3Months');
      case 'yearly': return t('finance.everyYear');
      default: return '';
    }
  };

  // Helper function to get translated days of week
  const getTranslatedDaysOfWeek = () => {
    return DAYS_OF_WEEK.map(day => ({
      ...day,
      label: t(`finance.${day.label.toLowerCase()}`),
      short: t(`finance.${day.short.toLowerCase()}`)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="w-5 h-5" />
            {t('finance.createRecurringTransaction')}
          </DialogTitle>
          <DialogDescription>
            {t('finance.setupAutomaticTransaction')}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            {/* Basic Transaction Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">{t('finance.transactionDetails')}</h3>
              
              {/* Type */}
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
                  placeholder="e.g., Monthly rent payment"
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
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>

              {/* Account */}
              <div className="grid gap-2">
                <Label htmlFor="account">{t('finance.account')} *</Label>
                <Select
                  value={formData.accountId}
                  onValueChange={(value) => setFormData({ ...formData, accountId: value })}
                  disabled={loadingAccounts}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingAccounts ? 'Loading accounts...' : t('finance.selectAccount')} />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingAccounts ? (
                      <SelectItem value="loading" disabled>
                        Loading accounts...
                      </SelectItem>
                    ) : accounts.length === 0 ? (
                      <SelectItem value="no-accounts" disabled>
                        No accounts found - Please go to Finances and create an account first
                      </SelectItem>
                    ) : (
                      accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({account.type}) - ${account.balance.toFixed(2)}
                        </SelectItem>
                      ))
                    )}
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
            </div>

            {/* Recurrence Configuration */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">{t('finance.recurrencePattern')}</h3>
              
              {/* Frequency */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>{t('finance.frequency')} *</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value: RecurrenceFrequency) => 
                      setFormData({ ...formData, frequency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getTranslatedFrequencyOptions().map((option) => (
                        <SelectItem key={option.frequency} value={option.frequency}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>{t('finance.every')}</Label>
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    value={formData.intervalCount}
                    onChange={(e) => setFormData({ ...formData, intervalCount: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              {/* Weekly Pattern */}
              {formData.frequency === 'weekly' && (
                <div className="grid gap-2">
                  <Label>{t('finance.daysOfWeek')} *</Label>
                  <div className="flex flex-wrap gap-2">
                    {getTranslatedDaysOfWeek().map((day) => (
                      <div key={day.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`day-${day.value}`}
                          checked={formData.daysOfWeek.includes(day.value)}
                          onCheckedChange={(checked) => 
                            handleWeekDayToggle(day.value, checked as boolean)
                          }
                        />
                        <Label htmlFor={`day-${day.value}`} className="text-sm">
                          {day.short}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Monthly Pattern */}
              {formData.frequency === 'monthly' && (
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label>{t('finance.monthlyPattern')}</Label>
                    <Select
                      value={formData.monthlyPattern}
                      onValueChange={(value: 'day' | 'week') => 
                        setFormData({ ...formData, monthlyPattern: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">{t('finance.specificDayOfMonth')}</SelectItem>
                        <SelectItem value="week">{t('finance.specificWeekAndDay')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.monthlyPattern === 'day' ? (
                    <div className="grid gap-2">
                      <Label>{t('finance.dayOfMonth')}</Label>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={formData.dayOfMonth}
                        onChange={(e) => setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Week of Month</Label>
                        <Select
                          value={formData.weekOfMonth.toString()}
                          onValueChange={(value) => 
                            setFormData({ ...formData, weekOfMonth: parseInt(value) })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WEEKS_OF_MONTH.map((week) => (
                              <SelectItem key={week.value} value={week.value.toString()}>
                                {week.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label>Day of Week</Label>
                        <Select
                          value={formData.dayOfWeek.toString()}
                          onValueChange={(value) => 
                            setFormData({ ...formData, dayOfWeek: parseInt(value) })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getTranslatedDaysOfWeek().map((day) => (
                              <SelectItem key={day.value} value={day.value.toString()}>
                                {day.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Schedule Configuration */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">{t('finance.schedule')}</h3>
              
              {/* Start Date */}
              <div className="grid gap-2">
                <Label>{t('finance.startDate')} *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : <span>{t('finance.pickADate')}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* End Date Option */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="use-end-date"
                  checked={useEndDate}
                  onCheckedChange={(checked) => {
                    setUseEndDate(checked as boolean);
                    if (!checked) {
                      setEndDate(undefined);
                    }
                  }}
                />
                <Label htmlFor="use-end-date">{t('finance.setEndDate')}</Label>
              </div>

              {useEndDate && (
                <div className="grid gap-2 ml-6">
                  <Label>{t('finance.endDate')}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : <span>{t('finance.pickADate')}</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => setEndDate(date)}
                        disabled={(date) => date < startDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Max Occurrences Option */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="use-max-occurrences"
                  checked={useMaxOccurrences}
                  onCheckedChange={(checked) => setUseMaxOccurrences(checked as boolean)}
                />
                <Label htmlFor="use-max-occurrences">{t('finance.limitNumberOfOccurrences')}</Label>
              </div>

              {useMaxOccurrences && (
                <div className="grid gap-2 ml-6">
                  <Label>Maximum Occurrences</Label>
                  <Input
                    type="number"
                    min="1"
                    max="1000"
                    value={formData.maxOccurrences}
                    onChange={(e) => setFormData({ ...formData, maxOccurrences: parseInt(e.target.value) || 1 })}
                  />
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="notes">{t('common.notes')}</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about this recurring transaction..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t('common.cancel')}
            </Button>
            <LoadingButton 
              type="submit" 
              loading={loading}
              loadingText="Creating..."
            >
              {t('finance.createRecurringTransaction')}
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateRecurringTransactionDialog;