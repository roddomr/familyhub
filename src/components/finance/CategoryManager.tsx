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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash, 
  ChevronRight, 
  ChevronDown,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Palette,
  Hash,
  Move
} from 'lucide-react';
import { useCategories, type TransactionCategory } from '@/hooks/useCategories';
import { useCategoryBudgets } from '@/hooks/useCategoryBudgets';
import { useTranslation } from 'react-i18next';
import { useEnhancedToast } from '@/hooks/useEnhancedToast';
import { CreateCategoryDialog } from './CreateCategoryDialog';
import { EditCategoryDialog } from './EditCategoryDialog';
import { CategoryBudgetDialog } from './CategoryBudgetDialog';
import { cn } from '@/lib/utils';

interface CategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CategoryManager = ({ open, onOpenChange }: CategoryManagerProps) => {
  const { t } = useTranslation();
  const toast = useEnhancedToast();
  const { 
    categories, 
    loading, 
    deleteCategory, 
    getCategoriesByType,
    reorderCategories
  } = useCategories();
  const { budgets = [] } = useCategoryBudgets(); // Default to empty array if budgets fail to load

  console.log('[DEBUG] CategoryManager render:', {
    open,
    categories: categories?.length,
    loading,
    budgets: budgets?.length
  });

  const [selectedType, setSelectedType] = useState<'income' | 'expense'>('expense');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<TransactionCategory | null>(null);
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);

  const currentCategories = getCategoriesByType(selectedType);

  const toggleExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleDelete = async (category: TransactionCategory) => {
    try {
      await deleteCategory(category.id);
      toast.success(t('finance.categories.deleted'));
    } catch (error) {
      toast.error(t('finance.categories.deleteError'));
    }
  };

  const handleEdit = (category: TransactionCategory) => {
    setSelectedCategory(category);
    setEditDialogOpen(true);
  };

  const handleCreateBudget = (category: TransactionCategory) => {
    setSelectedCategory(category);
    setBudgetDialogOpen(true);
  };

  const getCategoryBudget = (categoryId: string) => {
    return budgets?.find(budget => budget.category_id === categoryId) || null;
  };

  const handleDragStart = (e: React.DragEvent, categoryId: string) => {
    setDraggedCategory(categoryId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetCategoryId: string) => {
    e.preventDefault();
    
    if (!draggedCategory || draggedCategory === targetCategoryId) {
      setDraggedCategory(null);
      return;
    }

    // Find categories and update sort order
    const allCategories = [...currentCategories];
    const draggedIndex = allCategories.findIndex(cat => cat.id === draggedCategory);
    const targetIndex = allCategories.findIndex(cat => cat.id === targetCategoryId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reorder categories
    const reorderedCategories = [...allCategories];
    const [removed] = reorderedCategories.splice(draggedIndex, 1);
    reorderedCategories.splice(targetIndex, 0, removed);

    // Create updates for sort order
    const updates = reorderedCategories.map((cat, index) => ({
      id: cat.id,
      sort_order: index
    }));

    try {
      await reorderCategories(updates);
      toast.success(t('finance.categories.reordered'));
    } catch (error) {
      toast.error(t('finance.categories.reorderError'));
    } finally {
      setDraggedCategory(null);
    }
  };

  const renderCategoryItem = (category: TransactionCategory, level: number = 0) => {
    const hasSubcategories = category.subcategories && category.subcategories.length > 0;
    const isExpanded = expandedCategories.has(category.id);
    const budget = getCategoryBudget(category.id);

    return (
      <div key={category.id} className="space-y-1">
        <div
          className={cn(
            "flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors",
            draggedCategory === category.id && "opacity-50",
            level > 0 && "ml-6 border-l-2 border-l-muted-foreground/20"
          )}
          draggable
          onDragStart={(e) => handleDragStart(e, category.id)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, category.id)}
        >
          {/* Expand/Collapse Button */}
          {hasSubcategories ? (
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-6 w-6"
              onClick={() => toggleExpanded(category.id)}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          ) : (
            <div className="w-6" />
          )}

          {/* Category Color & Icon */}
          <div 
            className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: category.color || '#3B82F6' }}
          />

          {/* Category Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm truncate">{category.name}</h4>
              {category.is_default && (
                <Badge variant="secondary" className="text-xs">
                  {t('finance.categories.default')}
                </Badge>
              )}
              {budget && (
                <Badge variant="outline" className="text-xs">
                  <DollarSign className="h-3 w-3 mr-1" />
                  ${budget.amount.toLocaleString()}
                </Badge>
              )}
            </div>
            {category.description && (
              <p className="text-xs text-muted-foreground truncate">
                {category.description}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="p-1 h-6 w-6">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEdit(category)}>
                  <Edit className="h-4 w-4 mr-2" />
                  {t('common.edit')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCreateBudget(category)}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  {budget ? t('finance.budgets.edit') : t('finance.budgets.create')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => handleDelete(category)}
                  className="text-destructive"
                >
                  <Trash className="h-4 w-4 mr-2" />
                  {t('common.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Subcategories */}
        {hasSubcategories && isExpanded && (
          <div className="space-y-1">
            {category.subcategories!.map(subcategory => 
              renderCategoryItem(subcategory, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              {t('finance.categories.manage')}
            </DialogTitle>
            <DialogDescription>
              {t('finance.categories.manageDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-hidden">
            {/* Header Actions */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant={selectedType === 'expense' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedType('expense')}
                  className="flex items-center gap-2"
                >
                  <TrendingDown className="h-4 w-4" />
                  {t('finance.expense')}
                </Button>
                <Button
                  variant={selectedType === 'income' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedType('income')}
                  className="flex items-center gap-2"
                >
                  <TrendingUp className="h-4 w-4" />
                  {t('finance.income')}
                </Button>
              </div>

              <Button
                onClick={() => setCreateDialogOpen(true)}
                size="sm"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {t('finance.categories.create')}
              </Button>
            </div>

            <Separator className="mb-4" />

            {/* Categories List */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : currentCategories.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Hash className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t('finance.categories.empty')}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('finance.categories.createFirst')}
                  </Button>
                </div>
              ) : (
                currentCategories.map(category => renderCategoryItem(category))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Category Dialog */}
      <CreateCategoryDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultType={selectedType}
      />

      {/* Edit Category Dialog */}
      {selectedCategory && (
        <EditCategoryDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          category={selectedCategory}
          onClose={() => setSelectedCategory(null)}
        />
      )}

      {/* Category Budget Dialog */}
      {selectedCategory && (
        <CategoryBudgetDialog
          open={budgetDialogOpen}
          onOpenChange={setBudgetDialogOpen}
          category={selectedCategory}
          existingBudget={getCategoryBudget(selectedCategory.id)}
          onClose={() => setSelectedCategory(null)}
        />
      )}
    </>
  );
};