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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFamily } from '@/hooks/useFamily';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AddAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccountAdded?: () => void;
}

const AddAccountDialog = ({ open, onOpenChange, onAccountAdded }: AddAccountDialogProps) => {
  const { currentFamily } = useFamily();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'checking' as string,
    balance: '',
    currency: 'USD',
  });

  const accountTypes = [
    { value: 'checking', label: 'Checking Account' },
    { value: 'savings', label: 'Savings Account' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'cash', label: 'Cash' },
    { value: 'investment', label: 'Investment Account' },
    { value: 'other', label: 'Other' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFamily || !user || !formData.name || !formData.balance) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const balance = parseFloat(formData.balance);
      if (isNaN(balance)) {
        toast.error('Please enter a valid balance');
        setLoading(false);
        return;
      }

      // Insert account
      const { error } = await supabase
        .from('financial_accounts')
        .insert({
          family_id: currentFamily.id,
          name: formData.name,
          type: formData.type,
          balance: balance,
          currency: formData.currency,
          created_by: user.id,
        });

      if (error) throw error;

      toast.success('Account added successfully!');
      
      // Reset form
      setFormData({
        name: '',
        type: 'checking',
        balance: '',
        currency: 'USD',
      });
      
      onAccountAdded?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding account:', error);
      toast.error('Failed to add account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Financial Account</DialogTitle>
          <DialogDescription>
            Add a new bank account, credit card, or other financial account.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Account Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Account Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Main Checking, Savings"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Account Type */}
            <div className="grid gap-2">
              <Label htmlFor="type">Account Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  {accountTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Initial Balance */}
            <div className="grid gap-2">
              <Label htmlFor="balance">Initial Balance *</Label>
              <Input
                id="balance"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.balance}
                onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                required
              />
            </div>

            {/* Currency */}
            <div className="grid gap-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                </SelectContent>
              </Select>
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
              {loading ? 'Adding...' : 'Add Account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddAccountDialog;