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
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

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
    if (!currentFamily) return;

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

      setAccounts(accountsData || []);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Error loading accounts and categories:', error);
      toast.error('Failed to load accounts and categories');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFamily || !formData.description || !formData.amount || !formData.accountId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid amount');
        setLoading(false);
        return;
      }

      // Insert transaction
      const { error: transactionError } = await supabase
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
        });

      if (transactionError) throw transactionError;

      // Update account balance
      const balanceChange = formData.type === 'income' ? amount : -amount;
      const { error: balanceError } = await supabase.rpc('update_account_balance', {
        account_id: formData.accountId,
        amount_change: balanceChange
      });

      if (balanceError) {
        console.warn('Failed to update account balance:', balanceError);
      }

      toast.success('Transaction added successfully!');
      
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
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast.error('Failed to add transaction');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(cat => cat.type === formData.type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>
            Record a new income or expense transaction for your family.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Transaction Type */}
            <div className="grid gap-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'income' | 'expense') => {
                  setFormData({ ...formData, type: value, categoryId: '' });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                placeholder="e.g., Grocery shopping, Salary"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            {/* Amount */}
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount *</Label>
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

            {/* Date */}
            <div className="grid gap-2">
              <Label>Date *</Label>
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
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
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
              <Label htmlFor="account">Account *</Label>
              <Select
                value={formData.accountId}
                onValueChange={(value) => setFormData({ ...formData, accountId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
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
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category (optional)" />
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
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes (optional)"
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
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Transaction'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTransactionDialog;