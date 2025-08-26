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
import { useFamily } from '@/hooks/useFamily';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface CreateFamilyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateFamilyDialog = ({ open, onOpenChange }: CreateFamilyDialogProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { createFamily } = useFamily();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await createFamily(name.trim(), description.trim() || undefined);
      toast.success(t('family.familyCreatedSuccess'));
      onOpenChange(false);
      setName('');
      setDescription('');
    } catch (error) {
      toast.error(t('family.failedCreateFamily'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('family.createFamily')}</DialogTitle>
          <DialogDescription>
            {t('family.createFamilyDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t('family.familyName')} *</Label>
              <Input
                id="name"
                placeholder={t('family.familyNamePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">{t('family.descriptionOptional')}</Label>
              <Input
                id="description"
                placeholder={t('family.descriptionPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
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
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? t('family.creating') : t('family.createFamily')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateFamilyDialog;