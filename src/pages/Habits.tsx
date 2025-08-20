import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';

const Habits = () => {
  return (
    <DashboardLayout>
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Habits</h1>
          <p className="text-muted-foreground">Habit tracking module coming soon...</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Habits;