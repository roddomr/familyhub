import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useTranslation } from 'react-i18next';

const Todos = () => {
  const { t } = useTranslation();
  return (
    <DashboardLayout>
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t('finance.todos')}</h1>
          <p className="text-muted-foreground">{t('finance.todoManagementComingSoon')}</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Todos;