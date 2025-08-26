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
import { useLogger } from '@/hooks/useLogger';
import { useTranslation } from 'react-i18next';
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
  const { logInfo, logError } = useLogger();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'checking' as string,
    balance: '',
    currency: 'MXN',
  });

  const accountTypes = [
    { value: 'checking', label: t('finance.accountTypes.checking') },
    { value: 'savings', label: t('finance.accountTypes.savings') },
    { value: 'credit_card', label: t('finance.accountTypes.creditCard') },
    { value: 'cash', label: t('finance.accountTypes.cash') },
    { value: 'investment', label: t('finance.accountTypes.investment') },
    { value: 'other', label: t('finance.accountTypes.other') },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await logInfo('Account creation started', {
      family_id: currentFamily?.id,
      user_id: user?.id,
      form_data: formData
    }, 'finance', 'create_account');

    if (!currentFamily || !user || !formData.name || !formData.balance) {
      await logError('Account creation failed: missing required fields', {
        has_family: !!currentFamily,
        has_user: !!user,
        form_data: formData
      }, 'finance', 'create_account', 'VALIDATION_ERROR');
      toast.error(t('finance.fillRequired'));
      return;
    }

    setLoading(true);
    try {
      const balance = parseFloat(formData.balance);
      if (isNaN(balance)) {
        await logError('Account creation failed: invalid balance', {
          balance_input: formData.balance,
          parsed_balance: balance
        }, 'finance', 'create_account', 'INVALID_BALANCE');
        toast.error(t('finance.validAmount'));
        setLoading(false);
        return;
      }

      await logInfo('Inserting account into database', {
        family_id: currentFamily.id,
        account_data: {
          name: formData.name,
          type: formData.type,
          balance: balance,
          currency: formData.currency
        }
      }, 'finance', 'create_account');

      // Insert account
      const { data, error } = await supabase
        .from('financial_accounts')
        .insert({
          family_id: currentFamily.id,
          name: formData.name,
          type: formData.type,
          balance: balance,
          currency: formData.currency,
          created_by: user.id,
        })
        .select();

      if (error) {
        await logError('Database error creating account', {
          error: error.message,
          code: error.code,
          details: error.details
        }, 'finance', 'create_account', 'DATABASE_ERROR');
        throw error;
      }

      await logInfo('Account created successfully', {
        account_id: data?.[0]?.id,
        account_name: formData.name,
        initial_balance: balance
      }, 'finance', 'create_account');

      toast.success(t('finance.accountAdded'));
      
      // Reset form
      setFormData({
        name: '',
        type: 'checking',
        balance: '',
        currency: 'MXN',
      });
      
      onAccountAdded?.();
      onOpenChange(false);
    } catch (error: any) {
      await logError('Unexpected error creating account', {
        error: error.message,
        stack: error.stack
      }, 'finance', 'create_account', 'UNEXPECTED_ERROR', error.stack);
      console.error('Error adding account:', error);
      toast.error(t('finance.failedAddAccount'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('finance.addAccountTitle')}</DialogTitle>
          <DialogDescription>
            {t('finance.addAccountDescription')}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Account Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">{t('finance.accountName')} *</Label>
              <Input
                id="name"
                placeholder={t('finance.accountNamePlaceholder')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Account Type */}
            <div className="grid gap-2">
              <Label htmlFor="type">{t('finance.accountType')} *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('finance.selectAccountType')} />
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
              <Label htmlFor="balance">{t('finance.initialBalance')} *</Label>
              <Input
                id="balance"
                type="number"
                step="0.01"
                placeholder={t('finance.balancePlaceholder')}
                value={formData.balance}
                onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                required
              />
            </div>

            {/* Currency */}
            <div className="grid gap-2">
              <Label htmlFor="currency">{t('finance.currency')}</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('finance.selectCurrency')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MXN">{t('finance.currencies.MXN')}</SelectItem>
                  <SelectItem value="USD">{t('finance.currencies.USD')}</SelectItem>
                  <SelectItem value="EUR">{t('finance.currencies.EUR')}</SelectItem>
                  <SelectItem value="GBP">{t('finance.currencies.GBP')}</SelectItem>
                  <SelectItem value="CAD">{t('finance.currencies.CAD')}</SelectItem>
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
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('finance.adding') : t('finance.addAccount')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddAccountDialog;