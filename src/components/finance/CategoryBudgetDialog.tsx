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
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, DollarSign, Plus, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCategoryBudgets, type CategoryBudget } from '@/hooks/useCategoryBudgets';
import type { TransactionCategory } from '@/hooks/useCategories';
import { useTranslation } from 'react-i18next';
import { useEnhancedToast } from '@/hooks/useEnhancedToast';
import { LoadingButton } from '@/components/ui/loading-states';
import { EnhancedInput, useValidation, validateRequired, validateAmount } from '@/components/ui/form-field';

interface CategoryBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: TransactionCategory;
  existingBudget?: CategoryBudget;
  onClose: () => void;
}

export const CategoryBudgetDialog = ({ 
  open, 
  onOpenChange, 
  category,
  existingBudget,
  onClose 
}: CategoryBudgetDialogProps) => {
  const { t } = useTranslation();
  const toast = useEnhancedToast();
  const { createBudget, updateBudget } = useCategoryBudgets();
  const validation = useValidation();

  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [formData, setFormData] = useState({
    name: '',
    amount: category.budget_default_amount || 0,
    period: (category.budget_default_period as 'weekly' | 'monthly' | 'quarterly' | 'yearly') || 'monthly',
    alertThreshold: 0.80,
    alertEnabled: true,
    rolloverEnabled: false,
    rolloverLimit: 0
  });

  const isEditing = !!existingBudget;

  // Initialize form data when budget changes
  useEffect(() => {
    if (existingBudget) {
      setFormData({
        name: existingBudget.name,
        amount: existingBudget.amount,
        period: existingBudget.period as 'weekly' | 'monthly' | 'quarterly' | 'yearly',
        alertThreshold: existingBudget.alert_threshold || 0.80,
        alertEnabled: existingBudget.alert_enabled !== false,
        rolloverEnabled: existingBudget.rollover_enabled || false,
        rolloverLimit: existingBudget.rollover_limit || 0
      });
      setStartDate(new Date(existingBudget.start_date));
      setEndDate(existingBudget.end_date ? new Date(existingBudget.end_date) : undefined);
    } else {
      setFormData({
        name: `${category.name} Budget`,
        amount: category.budget_default_amount || 0,
        period: (category.budget_default_period as 'weekly' | 'monthly' | 'quarterly' | 'yearly') || 'monthly',
        alertThreshold: 0.80,
        alertEnabled: true,
        rolloverEnabled: false,
        rolloverLimit: 0
      });
      setStartDate(new Date());
      setEndDate(undefined);
    }
  }, [category, existingBudget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validation.validate('name', formData.name, [validateRequired])) {
      return;
    }
    
    if (!validation.validate('amount', formData.amount, [validateRequired, validateAmount])) {
      return;
    }

    setLoading(true);
    try {
      const budgetData = {
        category_id: category.id,
        name: formData.name,
        amount: formData.amount,
        period: formData.period,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
        alert_threshold: formData.alertThreshold,
        alert_enabled: formData.alertEnabled,
        rollover_enabled: formData.rolloverEnabled,
        rollover_limit: formData.rolloverEnabled ? formData.rolloverLimit : undefined
      };

      if (isEditing) {
        await updateBudget(existingBudget.id, budgetData);
        toast.success(t('finance.budgets.updated'));
      } else {
        await createBudget(budgetData);
        toast.success(t('finance.budgets.created'));
      }

      handleClose();
    } catch (error) {
      toast.error(isEditing ? t('finance.budgets.updateError') : t('finance.budgets.createError'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    onClose();
    validation.clearAll();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {isEditing ? t('finance.budgets.edit') : t('finance.budgets.create')}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? t('finance.budgets.editDescription') 
              : t('finance.budgets.createDescription', { category: category.name })
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category Display */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <div 
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            <span className="font-medium">{category.name}</span>
            <span className="text-sm text-muted-foreground">({category.type})</span>
          </div>

          {/* Budget Name */}
          <div className="space-y-2">
            <Label htmlFor="name">{t('common.name')} *</Label>
            <EnhancedInput
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={t('finance.budgets.namePlaceholder')}
              validation={validation}
              validationKey="name"
              required
            />
          </div>

          {/* Amount and Period */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">{t('finance.budgets.amount')} *</Label>
              <EnhancedInput
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  amount: parseFloat(e.target.value) || 0 
                }))}
                placeholder="0.00"
                validation={validation}
                validationKey="amount"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t('finance.budgets.period')} *</Label>
              <Select
                value={formData.period}
                onValueChange={(value: 'weekly' | 'monthly' | 'quarterly' | 'yearly') => 
                  setFormData(prev => ({ ...prev, period: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">{t('finance.periods.weekly')}</SelectItem>
                  <SelectItem value="monthly">{t('finance.periods.monthly')}</SelectItem>
                  <SelectItem value="quarterly">{t('finance.periods.quarterly')}</SelectItem>
                  <SelectItem value="yearly">{t('finance.periods.yearly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('finance.budgets.startDate')} *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP') : t('common.pickDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>{t('finance.budgets.endDate')} ({t('common.optional')})</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PPP') : t('finance.budgets.noEndDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Alert Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="alerts">{t('finance.budgets.enableAlerts')}</Label>
                <div className="text-sm text-muted-foreground">
                  {t('finance.budgets.alertsDescription')}
                </div>
              </div>
              <Switch
                id="alerts"
                checked={formData.alertEnabled}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, alertEnabled: checked }))}
              />
            </div>

            {formData.alertEnabled && (
              <div className="space-y-2">
                <Label htmlFor="threshold">{t('finance.budgets.alertThreshold')}</Label>
                <Select
                  value={formData.alertThreshold.toString()}
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    alertThreshold: parseFloat(value) 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.5">50%</SelectItem>
                    <SelectItem value="0.75">75%</SelectItem>
                    <SelectItem value="0.8">80%</SelectItem>
                    <SelectItem value="0.9">90%</SelectItem>
                    <SelectItem value="0.95">95%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Rollover Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="rollover">{t('finance.budgets.enableRollover')}</Label>
                <div className="text-sm text-muted-foreground">
                  {t('finance.budgets.rolloverDescription')}
                </div>
              </div>
              <Switch
                id="rollover"
                checked={formData.rolloverEnabled}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, rolloverEnabled: checked }))}
              />
            </div>

            {formData.rolloverEnabled && (
              <div className="space-y-2">
                <Label htmlFor="rolloverLimit">{t('finance.budgets.rolloverLimit')}</Label>
                <Input
                  id="rolloverLimit"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.rolloverLimit}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    rolloverLimit: parseFloat(e.target.value) || 0 
                  }))}
                  placeholder="0.00"
                />
              </div>
            )}
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          <LoadingButton
            type="submit"
            loading={loading}
            onClick={handleSubmit}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            {isEditing ? t('finance.budgets.update') : t('finance.budgets.create')}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};