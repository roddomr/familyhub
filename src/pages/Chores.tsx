import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useTranslation } from 'react-i18next';

const Chores = () => {
  const { t } = useTranslation();
  return (
    <DashboardLayout>
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t('finance.chores')}</h1>
          <p className="text-muted-foreground">{t('finance.choreTrackingComingSoon')}</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Chores;