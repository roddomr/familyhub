import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  DollarSign, 
  CheckSquare, 
  Calendar,
  Users,
  TrendingUp,
  Plus,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useTranslation } from 'react-i18next';

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const modules = [
    {
      title: t('dashboard.modules.habitTracker.title'),
      description: t('dashboard.modules.habitTracker.description'),
      icon: Target,
      color: 'text-brand-primary',
      bgColor: 'bg-brand-primary/10',
      progress: 78,
      route: '/habits',
      available: true
    },
    {
      title: t('dashboard.modules.financeTracker.title'),
      description: t('dashboard.modules.financeTracker.description'),
      icon: DollarSign,
      color: 'text-brand-secondary',
      bgColor: 'bg-brand-secondary/10',
      progress: 65,
      route: '/finances',
      available: true
    },
    {
      title: t('dashboard.modules.todoLists.title'),
      description: t('dashboard.modules.todoLists.description'),
      icon: CheckSquare,
      color: 'text-brand-accent',
      bgColor: 'bg-brand-accent/10',
      progress: 72,
      route: '/todos',
      available: true
    },
    {
      title: t('dashboard.modules.choresTracker.title'),
      description: t('dashboard.modules.choresTracker.description'),
      icon: Calendar,
      color: 'text-purple-500',
      bgColor: 'bg-purple-100',
      progress: 85,
      route: '/chores',
      available: true
    }
  ];

  const stats = [
    { label: t('dashboard.stats.activeHabits'), value: '12', trend: '+3' },
    { label: t('dashboard.stats.monthlySavings'), value: '$1,240', trend: '+12%' },
    { label: t('dashboard.stats.pendingTasks'), value: '8', trend: '-2' },
    { label: t('dashboard.stats.completedChores'), value: '24', trend: '+6' }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{t('nav.dashboard')}</h1>
          <p className="text-text-secondary">
            {t('dashboard.welcomeMessage')}
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="card-elevated animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-secondary">{stat.label}</p>
                    <div className="flex items-baseline space-x-2">
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <span className="text-sm text-success font-medium">{stat.trend}</span>
                    </div>
                  </div>
                  <TrendingUp className="h-4 w-4 text-success" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {modules.map((module, index) => {
            const Icon = module.icon;
            return (
              <Card 
                key={index}
                className={`card-interactive animate-slide-up ${!module.available ? 'opacity-60' : ''}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 ${module.bgColor} rounded-xl flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${module.color}`} />
                    </div>
                    {!module.available && (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                        {t('common.comingSoon')}
                      </span>
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-xl">{module.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {module.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {module.available && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary">{t('common.progress')}</span>
                        <span className="font-medium">{module.progress}%</span>
                      </div>
                      <Progress value={module.progress} className="h-2" />
                    </div>
                  )}
                  <Button 
                    variant={module.available ? "default" : "secondary"}
                    className="w-full"
                    onClick={() => module.available && navigate(module.route)}
                    disabled={!module.available}
                  >
                    {module.available ? (
                      <>
                        {t('dashboard.openModule')}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    ) : (
                      t('common.comingSoon')
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus className="w-5 h-5" />
              <span>{t('dashboard.quickActionsTitle')}</span>
            </CardTitle>
            <CardDescription>
              {t('dashboard.quickActionsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="h-auto p-4 flex-col space-y-2"
                onClick={() => navigate('/habits')}
              >
                <Target className="w-6 h-6 text-brand-primary" />
                <span>{t('dashboard.quickActions.addNewHabit')}</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 flex-col space-y-2"
                onClick={() => navigate('/finances')}
              >
                <DollarSign className="w-6 h-6 text-brand-secondary" />
                <span>{t('dashboard.quickActions.logExpense')}</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 flex-col space-y-2"
                onClick={() => navigate('/todos')}
              >
                <CheckSquare className="w-6 h-6 text-brand-accent" />
                <span>{t('dashboard.quickActions.addNewTask')}</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 flex-col space-y-2"
                onClick={() => navigate('/chores')}
              >
                <Calendar className="w-6 h-6 text-purple-500" />
                <span>{t('dashboard.quickActions.assignChore')}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;