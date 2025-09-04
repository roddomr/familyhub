import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useFamily } from '@/hooks/useFamily';
import { useLogger } from '@/hooks/useLogger';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { sanitizeText } from '@/lib/security/validation';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types';

export type TransactionCategory = Tables<'transaction_categories'> & {
  subcategories?: TransactionCategory[];
  parent?: TransactionCategory;
  transaction_count?: number;
  total_spent?: number;
};

export type CategoryBudget = Tables<'category_budgets'> & {
  category?: TransactionCategory;
};

export type CategoryBudgetSummary = Tables<'category_budget_summaries'> & {
  budget?: CategoryBudget;
};

interface CategoryHierarchy {
  id: string;
  name: string;
  parent_id: string | null;
  parent_name: string | null;
  level: number;
  path: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  budget_default_amount: number;
  budget_default_period: string;
}

interface CreateCategoryData {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  type: 'income' | 'expense';
  parent_id?: string;
  sort_order?: number;
  budget_default_amount?: number;
  budget_default_period?: 'weekly' | 'monthly' | 'yearly';
}

interface UpdateCategoryData {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  parent_id?: string;
  sort_order?: number;
  is_active?: boolean;
  budget_default_amount?: number;
  budget_default_period?: 'weekly' | 'monthly' | 'yearly';
}

export const useCategories = () => {
  const { currentFamily } = useFamily();
  const { user } = useAuth();
  const { logInfo, logError } = useLogger();
  const { logTransaction } = useAuditLog();
  
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [categoryHierarchy, setCategoryHierarchy] = useState<CategoryHierarchy[]>([]);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false); // Use ref to track loading state without dependency issues

  // Load categories with hierarchy
  const loadCategories = useCallback(async () => {
    console.log('[DEBUG] loadCategories called, currentFamily:', !!currentFamily, 'loadingRef:', loadingRef.current);
    if (!currentFamily || loadingRef.current) {
      console.log('[DEBUG] Skipping loadCategories - either no family or already loading');
      return; // Prevent concurrent loads
    }

    loadingRef.current = true;
    setLoading(true);
    try {
      console.log('[DEBUG] Starting categories load for family:', currentFamily.id);
      
      // Log info without using the hook dependency
      try {
        await logInfo('Loading categories with hierarchy', {
          family_id: currentFamily.id
        }, 'finance', 'load_categories');
      } catch (logErr) {
        console.warn('Info logging failed:', logErr);
      }

      // Load basic categories - using * to get all available columns
      const { data: flatCategories, error: categoriesError } = await supabase
        .from('transaction_categories')
        .select('*')
        .eq('family_id', currentFamily.id)
        .order('type', { ascending: true })
        .order('name', { ascending: true });

      if (categoriesError) {
        console.error('Categories loading error:', categoriesError);
        throw categoriesError;
      }

      // Debug: Log the structure of the first category to see available columns
      if (flatCategories && flatCategories.length > 0) {
        console.log('[DEBUG] Available columns in transaction_categories:', Object.keys(flatCategories[0]));
      }

      // Just use flat categories for now - no hierarchy to reduce complexity
      setCategories(flatCategories || []);
      setCategoryHierarchy([]);

      console.log(`[INFO] Categories loaded successfully: ${flatCategories?.length || 0} categories`);
      console.log('[DEBUG] Categories data:', flatCategories?.map(cat => ({id: cat.id, name: cat.name})));

    } catch (error: any) {
      console.error('Categories loading failed:', error);
      
      // Log error without using the hook dependency
      try {
        await logError('Failed to load categories', error, 'finance', 'load_categories', 'FETCH_ERROR');
      } catch (logErr) {
        console.warn('Error logging failed:', logErr);
      }
      
      // If it's a network/fetch error or migration-related issue, set empty state instead of throwing
      if (error.name === 'TypeError' || 
          error.message?.includes('Failed to fetch') ||
          error.code === '42703' || // column does not exist
          error.code === '42883' || // function does not exist
          error.code === '42P01' || // relation does not exist
          error.message?.includes('does not exist')) {
        console.warn('Setting empty categories due to migration/network issues');
        setCategories([]);
        setCategoryHierarchy([]);
        return;
      }
      
      throw error;
    } finally {
      console.log('[DEBUG] loadCategories finishing, setting loading states to false');
      loadingRef.current = false;
      setLoading(false);
    }
  }, [currentFamily]);

  // Create new category
  const createCategory = useCallback(async (categoryData: CreateCategoryData) => {
    if (!currentFamily || !user) {
      throw new Error('Missing family or user context');
    }

    try {
      console.log('[DEBUG] Creating new category:', categoryData.name, 'for family:', currentFamily.id);
      
      // Log info without dependency
      try {
        await logInfo('Creating new category', {
          family_id: currentFamily.id,
          category_name: categoryData.name,
          category_type: categoryData.type,
          parent_id: categoryData.parent_id
        }, 'finance', 'create_category');
      } catch (logErr) {
        console.warn('Info logging failed:', logErr);
      }

      const sanitizedData: TablesInsert<'transaction_categories'> = {
        family_id: currentFamily.id,
        name: sanitizeText(categoryData.name),
        description: categoryData.description ? sanitizeText(categoryData.description) : null,
        color: categoryData.color || '#3B82F6',
        icon: categoryData.icon || 'Tag',
        type: categoryData.type,
        parent_id: categoryData.parent_id || null,
        sort_order: categoryData.sort_order || 0,
        budget_default_amount: categoryData.budget_default_amount || 0,
        budget_default_period: categoryData.budget_default_period || 'monthly',
        is_default: false
      };

      const { data, error } = await supabase
        .from('transaction_categories')
        .insert(sanitizedData)
        .select()
        .single();

      if (error) throw error;

      console.log('[DEBUG] Category created successfully:', data.id, data.name);
      
      await logTransaction('category_created', {
        category_id: data.id,
        category_name: data.name,
        category_type: data.type,
        parent_id: data.parent_id
      });

      await loadCategories();
      return data;

    } catch (error) {
      console.error('[ERROR] Failed to create category:', error);
      // Log error without dependency
      try {
        await logError('Failed to create category', error, 'finance', 'create_category', 'CREATE_ERROR');
      } catch (logErr) {
        console.warn('Error logging failed:', logErr);
      }
      throw error;
    }
  }, [currentFamily, user, loadCategories, logTransaction]);

  // Update category
  const updateCategory = useCallback(async (categoryId: string, updateData: UpdateCategoryData) => {
    if (!currentFamily || !user) {
      throw new Error('Missing family or user context');
    }

    try {
      console.log('[DEBUG] Updating category:', categoryId, 'with data:', Object.keys(updateData));
      
      // Log info without dependency
      try {
        await logInfo('Updating category', {
          family_id: currentFamily.id,
          category_id: categoryId,
          updates: Object.keys(updateData)
        }, 'finance', 'update_category');
      } catch (logErr) {
        console.warn('Info logging failed:', logErr);
      }

      const sanitizedData: TablesUpdate<'transaction_categories'> = {};
      
      if (updateData.name) sanitizedData.name = sanitizeText(updateData.name);
      if (updateData.description !== undefined) {
        sanitizedData.description = updateData.description ? sanitizeText(updateData.description) : null;
      }
      if (updateData.color) sanitizedData.color = updateData.color;
      if (updateData.icon) sanitizedData.icon = updateData.icon;
      if (updateData.parent_id !== undefined) sanitizedData.parent_id = updateData.parent_id;
      if (updateData.sort_order !== undefined) sanitizedData.sort_order = updateData.sort_order;
      if (updateData.is_active !== undefined) sanitizedData.is_active = updateData.is_active;
      if (updateData.budget_default_amount !== undefined) sanitizedData.budget_default_amount = updateData.budget_default_amount;
      if (updateData.budget_default_period) sanitizedData.budget_default_period = updateData.budget_default_period;

      const { data, error } = await supabase
        .from('transaction_categories')
        .update(sanitizedData)
        .eq('id', categoryId)
        .eq('family_id', currentFamily.id)
        .select()
        .single();

      if (error) throw error;

      console.log('[DEBUG] Category updated successfully:', data.name);

      await logTransaction('category_updated', {
        category_id: categoryId,
        category_name: data.name,
        updates: Object.keys(sanitizedData)
      });

      await loadCategories();
      return data;

    } catch (error) {
      console.error('[ERROR] Failed to update category:', error);
      // Log error without dependency
      try {
        await logError('Failed to update category', error, 'finance', 'update_category', 'UPDATE_ERROR');
      } catch (logErr) {
        console.warn('Error logging failed:', logErr);
      }
      throw error;
    }
  }, [currentFamily, user, loadCategories, logTransaction]);

  // Delete category (soft delete)
  const deleteCategory = useCallback(async (categoryId: string) => {
    if (!currentFamily || !user) {
      throw new Error('Missing family or user context');
    }

    try {
      console.log('[DEBUG] Deleting category:', categoryId);
      
      // Log info without dependency
      try {
        await logInfo('Deleting category', {
          family_id: currentFamily.id,
          category_id: categoryId
        }, 'finance', 'delete_category');
      } catch (logErr) {
        console.warn('Info logging failed:', logErr);
      }

      // Check if category has transactions
      const { data: transactionCheck } = await supabase
        .from('transactions')
        .select('id')
        .eq('category_id', categoryId)
        .eq('family_id', currentFamily.id)
        .limit(1);

      if (transactionCheck && transactionCheck.length > 0) {
        // Soft delete - just mark as inactive
        const { data, error } = await supabase
          .from('transaction_categories')
          .update({ is_active: false })
          .eq('id', categoryId)
          .eq('family_id', currentFamily.id)
          .select()
          .single();

        if (error) throw error;

        console.log('[DEBUG] Category soft deleted (deactivated):', data.name);

        await logTransaction('category_deactivated', {
          category_id: categoryId,
          category_name: data.name,
          reason: 'has_transactions'
        });
      } else {
        // Hard delete - no transactions exist
        const { error } = await supabase
          .from('transaction_categories')
          .delete()
          .eq('id', categoryId)
          .eq('family_id', currentFamily.id);

        if (error) throw error;

        console.log('[DEBUG] Category hard deleted:', categoryId);

        await logTransaction('category_deleted', {
          category_id: categoryId,
          reason: 'no_transactions'
        });
      }

      await loadCategories();

    } catch (error) {
      console.error('[ERROR] Failed to delete category:', error);
      // Log error without dependency
      try {
        await logError('Failed to delete category', error, 'finance', 'delete_category', 'DELETE_ERROR');
      } catch (logErr) {
        console.warn('Error logging failed:', logErr);
      }
      throw error;
    }
  }, [currentFamily, user, loadCategories, logTransaction]);

  // Reorder categories
  const reorderCategories = useCallback(async (categoryUpdates: Array<{ id: string; sort_order: number }>) => {
    if (!currentFamily || !user) {
      throw new Error('Missing family or user context');
    }

    try {
      console.log('[DEBUG] Reordering', categoryUpdates.length, 'categories');
      
      // Log info without dependency
      try {
        await logInfo('Reordering categories', {
          family_id: currentFamily.id,
          categories_count: categoryUpdates.length
        }, 'finance', 'reorder_categories');
      } catch (logErr) {
        console.warn('Info logging failed:', logErr);
      }

      // Update all categories in a transaction-like manner
      for (const update of categoryUpdates) {
        const { error } = await supabase
          .from('transaction_categories')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id)
          .eq('family_id', currentFamily.id);

        if (error) throw error;
      }

      console.log('[DEBUG] Categories reordered successfully');

      await logTransaction('categories_reordered', {
        categories_updated: categoryUpdates.length
      });

      await loadCategories();

    } catch (error) {
      console.error('[ERROR] Failed to reorder categories:', error);
      // Log error without dependency
      try {
        await logError('Failed to reorder categories', error, 'finance', 'reorder_categories', 'REORDER_ERROR');
      } catch (logErr) {
        console.warn('Error logging failed:', logErr);
      }
      throw error;
    }
  }, [currentFamily, user, loadCategories, logTransaction]);

  // Get categories by type with counts
  const getCategoriesByType = useCallback((type: 'income' | 'expense'): TransactionCategory[] => {
    const filtered = categories.filter(category => category.type === type);
    console.log(`[DEBUG] getCategoriesByType(${type}): ${filtered.length} categories`, filtered.map(c => c.name));
    return filtered;
  }, [categories]);

  // Get flattened categories (including subcategories)
  const getFlatCategories = useCallback((): TransactionCategory[] => {
    const flat: TransactionCategory[] = [];
    
    const addToFlat = (cats: TransactionCategory[]) => {
      cats.forEach(cat => {
        flat.push(cat);
        if (cat.subcategories && cat.subcategories.length > 0) {
          addToFlat(cat.subcategories);
        }
      });
    };
    
    addToFlat(categories);
    return flat;
  }, [categories]);

  // Load categories on mount
  useEffect(() => {
    if (currentFamily) {
      loadCategories();
    }
  }, [currentFamily, loadCategories]);

  return {
    categories,
    categoryHierarchy,
    loading,
    loadCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    getCategoriesByType,
    getFlatCategories
  };
};