import React, { useState } from 'react';
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
import { 
  Palette,
  Plus,
  Hash,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { useCategories, type TransactionCategory } from '@/hooks/useCategories';
import { useTranslation } from 'react-i18next';
import { useEnhancedToast } from '@/hooks/useEnhancedToast';
import { LoadingButton } from '@/components/ui/loading-states';
import { EnhancedInput, EnhancedTextarea, useValidation, validateRequired } from '@/components/ui/form-field';
import { IconPicker } from '@/components/ui/icon-picker';
import { ColorPicker } from '@/components/ui/color-picker';

interface CreateCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: 'income' | 'expense';
  parentCategory?: TransactionCategory;
  onCategoryCreated?: () => void;
}

const PRESET_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

const COMMON_ICONS = {
  expense: [
    'ShoppingCart', 'Car', 'Home', 'Zap', 'Heart', 'Book', 
    'Shirt', 'UtensilsCrossed', 'Film', 'Gamepad2', 'Fuel',
    'Train', 'Wrench', 'ParkingCircle', 'Apple', 'Beef', 'Spray'
  ],
  income: [
    'Briefcase', 'Code', 'TrendingUp', 'Gift', 'DollarSign',
    'Award', 'Clock', 'Plus', 'Star', 'Crown', 'Target'
  ]
};

export const CreateCategoryDialog = ({ 
  open, 
  onOpenChange, 
  defaultType = 'expense',
  parentCategory,
  onCategoryCreated
}: CreateCategoryDialogProps) => {
  const { t } = useTranslation();
  const toast = useEnhancedToast();
  const { createCategory, categories, getFlatCategories } = useCategories();
  const validation = useValidation();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: defaultType,
    parentId: parentCategory?.id || '',
    color: PRESET_COLORS[0],
    icon: COMMON_ICONS[defaultType][0],
    budgetDefaultAmount: 0,
    budgetDefaultPeriod: 'monthly' as 'weekly' | 'monthly' | 'yearly'
  });

  const availableParents = categories.filter(cat => 
    cat.type === formData.type && !cat.parent_id
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validation.validateField('name', formData.name, validateRequired)) {
      return;
    }

    setLoading(true);
    try {
      await createCategory({
        name: formData.name,
        description: formData.description || undefined,
        type: formData.type as 'income' | 'expense',
        parent_id: formData.parentId === 'no-parent' ? undefined : formData.parentId || undefined,
        color: formData.color,
        icon: formData.icon,
        budget_default_amount: formData.budgetDefaultAmount,
        budget_default_period: formData.budgetDefaultPeriod
      });

      toast.success(t('finance.categories.created'));
      console.log('[DEBUG] Category created successfully, calling callback...');
      onCategoryCreated?.(); // Notify parent component
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error(t('finance.categories.createError'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: defaultType,
      parentId: parentCategory?.id || 'no-parent',
      color: PRESET_COLORS[0],
      icon: COMMON_ICONS[defaultType][0],
      budgetDefaultAmount: 0,
      budgetDefaultPeriod: 'monthly'
    });
    validation.clearErrors();
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {parentCategory 
              ? t('finance.categories.createSubcategory')
              : t('finance.categories.create')
            }
          </DialogTitle>
          <DialogDescription>
            {parentCategory
              ? t('finance.categories.createSubcategoryDescription', { parent: parentCategory.name })
              : t('finance.categories.createDescription')
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category Type */}
          {!parentCategory && (
            <div className="space-y-2">
              <Label>{t('finance.type')}</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'income' | 'expense') => {
                  setFormData(prev => ({
                    ...prev,
                    type: value,
                    icon: COMMON_ICONS[value][0],
                    parentId: ''
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4" />
                      {t('finance.expense')}
                    </div>
                  </SelectItem>
                  <SelectItem value="income">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      {t('finance.income')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Parent Category (for subcategories) */}
          {!parentCategory && availableParents.length > 0 && (
            <div className="space-y-2">
              <Label>{t('finance.categories.parentCategory')} ({t('common.optional')})</Label>
              <Select
                value={formData.parentId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, parentId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('finance.categories.selectParent')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-parent">
                    {t('finance.categories.noParent')}
                  </SelectItem>
                  {availableParents.map(parent => (
                    <SelectItem key={parent.id} value={parent.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: parent.color }}
                        />
                        {parent.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Category Name */}
          <div className="space-y-2">
            <Label htmlFor="name">{t('common.name')} *</Label>
            <EnhancedInput
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={t('finance.categories.namePlaceholder')}
              validation={validation}
              validationKey="name"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('common.description')} ({t('common.optional')})</Label>
            <EnhancedTextarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder={t('finance.categories.descriptionPlaceholder')}
              validation={validation}
              validationKey="description"
              rows={2}
            />
          </div>

          {/* Color and Icon */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('finance.categories.color')}</Label>
              <ColorPicker
                value={formData.color}
                onChange={(color) => setFormData(prev => ({ ...prev, color }))}
                presets={PRESET_COLORS}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('finance.categories.icon')}</Label>
              <IconPicker
                value={formData.icon}
                onChange={(icon) => setFormData(prev => ({ ...prev, icon }))}
                icons={COMMON_ICONS[formData.type]}
              />
            </div>
          </div>

          {/* Default Budget Settings */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t('finance.categories.defaultBudget')} ({t('common.optional')})
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.budgetDefaultAmount}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    budgetDefaultAmount: parseFloat(e.target.value) || 0 
                  }))}
                />
              </div>
              <Select
                value={formData.budgetDefaultPeriod}
                onValueChange={(value: 'weekly' | 'monthly' | 'yearly') => 
                  setFormData(prev => ({ ...prev, budgetDefaultPeriod: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">{t('finance.periods.weekly')}</SelectItem>
                  <SelectItem value="monthly">{t('finance.periods.monthly')}</SelectItem>
                  <SelectItem value="yearly">{t('finance.periods.yearly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            <Plus className="h-4 w-4 mr-2" />
            {t('finance.categories.create')}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};