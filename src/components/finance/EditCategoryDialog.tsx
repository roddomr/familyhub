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
import { Switch } from '@/components/ui/switch';
import { Edit, TrendingUp, TrendingDown } from 'lucide-react';
import { useCategories, type TransactionCategory } from '@/hooks/useCategories';
import { useTranslation } from 'react-i18next';
import { useEnhancedToast } from '@/hooks/useEnhancedToast';
import { LoadingButton } from '@/components/ui/loading-states';
import { EnhancedInput, EnhancedTextarea, useValidation, validateRequired } from '@/components/ui/form-field';
import { IconPicker } from '@/components/ui/icon-picker';
import { ColorPicker } from '@/components/ui/color-picker';

interface EditCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: TransactionCategory;
  onClose: () => void;
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

export const EditCategoryDialog = ({ 
  open, 
  onOpenChange, 
  category,
  onClose 
}: EditCategoryDialogProps) => {
  const { t } = useTranslation();
  const toast = useEnhancedToast();
  const { updateCategory, categories } = useCategories();
  const validation = useValidation();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentId: '',
    color: '#3B82F6',
    icon: 'Hash',
    isActive: true,
    budgetDefaultAmount: 0,
    budgetDefaultPeriod: 'monthly' as 'weekly' | 'monthly' | 'yearly'
  });

  // Initialize form data when category changes
  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        description: category.description || '',
        parentId: category.parent_id || 'no-parent',
        color: category.color || '#3B82F6',
        icon: category.icon || 'Hash',
        isActive: category.is_active !== false,
        budgetDefaultAmount: category.budget_default_amount || 0,
        budgetDefaultPeriod: (category.budget_default_period as 'weekly' | 'monthly' | 'yearly') || 'monthly'
      });
    }
  }, [category]);

  const availableParents = categories.filter(cat => 
    cat.type === category.type && !cat.parent_id && cat.id !== category.id
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validation.validate('name', formData.name, [validateRequired])) {
      return;
    }

    setLoading(true);
    try {
      await updateCategory(category.id, {
        name: formData.name,
        description: formData.description || undefined,
        parent_id: formData.parentId === 'no-parent' ? null : formData.parentId || null,
        color: formData.color,
        icon: formData.icon,
        is_active: formData.isActive,
        budget_default_amount: formData.budgetDefaultAmount,
        budget_default_period: formData.budgetDefaultPeriod
      });

      toast.success(t('finance.categories.updated'));
      handleClose();
    } catch (error) {
      toast.error(t('finance.categories.updateError'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    onClose();
    validation.clearAll();
  };

  if (!category) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            {t('finance.categories.edit')}
          </DialogTitle>
          <DialogDescription>
            {t('finance.categories.editDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Type Display */}
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            {category.type === 'income' ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
            <span className="text-sm font-medium">
              {category.type === 'income' ? t('finance.income') : t('finance.expense')}
            </span>
            {category.is_default && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {t('finance.categories.default')}
              </span>
            )}
          </div>

          {/* Parent Category (for subcategories) */}
          {availableParents.length > 0 && (
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
                icons={COMMON_ICONS[category.type]}
              />
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="active">{t('finance.categories.active')}</Label>
              <div className="text-sm text-muted-foreground">
                {t('finance.categories.activeDescription')}
              </div>
            </div>
            <Switch
              id="active"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
            />
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
            <Edit className="h-4 w-4 mr-2" />
            {t('finance.categories.update')}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};