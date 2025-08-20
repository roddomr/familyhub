import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';

const Todos = () => {
  return (
    <DashboardLayout>
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">To-Do Lists</h1>
          <p className="text-muted-foreground">Todo management module coming soon...</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Todos;