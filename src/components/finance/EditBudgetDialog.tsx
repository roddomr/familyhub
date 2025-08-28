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
import { CalendarIcon, Target } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useFamily } from '@/hooks/useFamily';
import { useLogger } from '@/hooks/useLogger';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { LoadingButton } from '@/components/ui/loading-states';
import { EnhancedInput, useValidation, validateRequired, validateAmount } from '@/components/ui/form-field';
import { useEnhancedToast } from '@/hooks/useEnhancedToast';
import type { Budget, TransactionCategory } from '@/hooks/useFinances';

interface EditBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: Budget;
  onBudgetUpdated?: () => void;
}

interface Category {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string;
}

export const EditBudgetDialog: React.FC<EditBudgetDialogProps> = ({
  open,
  onOpenChange,
  budget,
  onBudgetUpdated
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentFamily } = useFamily();
  const { logInfo, logError } = useLogger();
  const toast = useEnhancedToast();

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    period: 'monthly',
    categoryId: 'all-categories',
    startDate: new Date(),
    alertThreshold: '80'
  });

  const validation = useValidation();

  // Initialize form data when budget changes
  useEffect(() => {
    if (budget && open) {
      setFormData({
        name: budget.name,
        amount: budget.amount.toString(),
        period: budget.period,
        categoryId: budget.category_id || 'all-categories',
        startDate: new Date(budget.start_date),
        alertThreshold: (budget.alert_threshold * 100).toString()
      });
      validation.clearErrors();
    }
  }, [budget, open]);

  // Load categories when dialog opens
  useEffect(() => {
    if (open && currentFamily) {
      loadCategories();
    }
  }, [open, currentFamily]);

  const loadCategories = async () => {
    if (!currentFamily) return;

    try {
      const { data, error } = await supabase
        .from('transaction_categories')
        .select('*')
        .eq('family_id', currentFamily.id)
        .eq('type', 'expense') // Budgets are typically for expense categories
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.apiError(error, 'loading categories');
    }
  };

  const resetForm = () => {
    if (budget) {
      setFormData({
        name: budget.name,
        amount: budget.amount.toString(),
        period: budget.period,
        categoryId: budget.category_id || 'all-categories',
        startDate: new Date(budget.start_date),
        alertThreshold: (budget.alert_threshold * 100).toString()
      });
    }
    validation.clearErrors();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    let isValid = true;
    
    if (!formData.name.trim()) {
      validation.setError('name', 'Budget name is required');
      isValid = false;
    } else {
      validation.setError('name', '');
    }
    
    const amountError = validateAmount(formData.amount);
    validation.setError('amount', amountError);
    if (amountError) isValid = false;
    
    if (!isValid || !user || !currentFamily) {
      return;
    }

    setLoading(true);
    
    try {
      await logInfo('Updating budget', {
        family_id: currentFamily.id,
        budget_id: budget.id,
        name: formData.name,
        amount: formData.amount,
        period: formData.period
      }, 'finance', 'budget-update');

      // Calculate end date based on period and start date
      const endDate = new Date(formData.startDate);
      switch (formData.period) {
        case 'weekly':
          endDate.setDate(endDate.getDate() + 7);
          break;
        case 'bi-weekly':
          endDate.setDate(endDate.getDate() + 15); // Quincenal
          break;
        case 'fortnightly':
          endDate.setDate(endDate.getDate() + 14); // Catorcenal
          break;
        case 'monthly':
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case 'yearly':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
      }

      const { error } = await supabase
        .from('budgets')
        .update({
          category_id: formData.categoryId === 'all-categories' ? null : formData.categoryId,
          name: formData.name.trim(),
          amount: parseFloat(formData.amount),
          period: formData.period,
          start_date: formData.startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          alert_threshold: parseFloat(formData.alertThreshold) / 100,
          updated_at: new Date().toISOString()
        })
        .eq('id', budget.id);

      if (error) throw error;

      await logInfo('Budget updated successfully', {
        family_id: currentFamily.id,
        budget_id: budget.id,
        budget_name: formData.name
      }, 'finance', 'budget-update');

      toast.success({ 
        title: t('finance.budgetUpdatedSuccessfully'),
        description: t('finance.budgetUpdatedDescription', { name: formData.name })
      });

      onOpenChange(false);
      onBudgetUpdated?.();

    } catch (error: any) {
      console.error('Error updating budget:', error);
      
      await logError('Failed to update budget', error, {
        family_id: currentFamily?.id,
        budget_id: budget?.id,
        form_data: formData
      }, 'finance', 'budget-update');

      toast.apiError(error, 'updating budget');
    } finally {
      setLoading(false);
    }
  };

  const getPeriodOptions = () => [
    { value: 'weekly', label: t('finance.weekly') },
    { value: 'bi-weekly', label: t('finance.biWeekly') },
    { value: 'fortnightly', label: t('finance.fortnightly') },
    { value: 'monthly', label: t('finance.monthly') },
    { value: 'yearly', label: t('finance.yearly') }
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-brand-primary" />
            {t('finance.editBudget')}
          </DialogTitle>
          <DialogDescription>
            {t('finance.editBudgetDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Budget Name */}
          <div className="space-y-2">
            <Label htmlFor="budget-name">{t('finance.budgetName')}</Label>
            <EnhancedInput
              id="budget-name"
              placeholder={t('finance.budgetNamePlaceholder')}
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              error={validation.errors.name}
              onBlur={() => {
                if (!formData.name.trim()) {
                  validation.setError('name', 'Budget name is required');
                } else {
                  validation.setError('name', '');
                }
              }}
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="budget-amount">{t('finance.budgetAmount')}</Label>
            <EnhancedInput
              id="budget-amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              error={validation.errors.amount}
              onBlur={() => {
                const amountError = validateAmount(formData.amount);
                validation.setError('amount', amountError);
              }}
            />
          </div>

          {/* Period */}
          <div className="space-y-2">
            <Label htmlFor="budget-period">{t('finance.budgetPeriod')}</Label>
            <Select 
              value={formData.period} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, period: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('finance.selectPeriod')} />
              </SelectTrigger>
              <SelectContent>
                {getPeriodOptions().map(period => (
                  <SelectItem key={period.value} value={period.value}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="budget-category">{t('finance.category')} ({t('finance.optional')})</Label>
            <Select 
              value={formData.categoryId} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('finance.selectCategory')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-categories">{t('finance.allCategories')}</SelectItem>
                {categories.map(category => (
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

          {/* Start Date */}
          <div className="space-y-2">
            <Label>{t('finance.startDate')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.startDate ? format(formData.startDate, 'PPP') : t('finance.selectDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.startDate}
                  onSelect={(date) => date && setFormData(prev => ({ ...prev, startDate: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Alert Threshold */}
          <div className="space-y-2">
            <Label htmlFor="alert-threshold">
              {t('finance.alertThreshold')} ({formData.alertThreshold}%)
            </Label>
            <Input
              id="alert-threshold"
              type="range"
              min="50"
              max="100"
              step="5"
              value={formData.alertThreshold}
              onChange={(e) => setFormData(prev => ({ ...prev, alertThreshold: e.target.value }))}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {t('finance.alertThresholdDescription')}
            </p>
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
              disabled={false}
            >
              {t('finance.updateBudget')}
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditBudgetDialog;