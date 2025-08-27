import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import LogsViewer from '@/components/debug/LogsViewer';
import { LanguageSelector } from '@/components/ui/language-selector';
import { ErrorHandlingDemo } from '@/components/demo/ErrorHandlingDemo';
import { useTranslation } from 'react-i18next';
import { 
  User, 
  Shield, 
  Bell, 
  Palette, 
  Database,
  LogOut,
  Settings as SettingsIcon,
  AlertTriangle 
} from 'lucide-react';

const Settings = () => {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <SettingsIcon className="w-8 h-8 text-brand-primary" />
          <div>
            <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
            <p className="text-text-secondary mt-1">
              {t('settings.managePreferences')}
            </p>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="profile">{t('settings.profile')}</TabsTrigger>
            <TabsTrigger value="security">{t('settings.security')}</TabsTrigger>
            <TabsTrigger value="notifications">{t('settings.notifications')}</TabsTrigger>
            <TabsTrigger value="appearance">{t('settings.appearance')}</TabsTrigger>
            <TabsTrigger value="debug">{t('settings.debug')}</TabsTrigger>
            <TabsTrigger value="error-demo">Error Demo</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5" />
                  <div>
                    <CardTitle>{t('settings.profileInformation')}</CardTitle>
                    <CardDescription>{t('settings.managePersonalInfo')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">{t('common.email')}</label>
                    <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('settings.userId')}</label>
                    <p className="text-sm text-muted-foreground mt-1 font-mono">{user?.id}</p>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <Button variant="outline" onClick={handleSignOut} disabled={loading}>
                    <LogOut className="w-4 h-4 mr-2" />
                    {loading ? t('settings.signingOut') : t('settings.signOut')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5" />
                  <div>
                    <CardTitle>{t('settings.securitySettings')}</CardTitle>
                    <CardDescription>{t('settings.manageAccountSecurity')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{t('settings.securityComingSoon')}</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <Bell className="w-5 h-5" />
                  <div>
                    <CardTitle>{t('settings.notificationPreferences')}</CardTitle>
                    <CardDescription>{t('settings.controlNotifications')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{t('settings.notificationsComingSoon')}</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <Palette className="w-5 h-5" />
                  <div>
                    <CardTitle>{t('settings.preferences')}</CardTitle>
                    <CardDescription>{t('settings.title')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Language Selector */}
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {t('settings.language')}
                    </label>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.selectLanguage')}
                    </p>
                  </div>
                  <LanguageSelector />
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {t('settings.moreAppearanceSettings')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Debug Tab */}
          <TabsContent value="debug">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Database className="w-5 h-5" />
                    <div>
                      <CardTitle>{t('settings.debugInformation')}</CardTitle>
                      <CardDescription>{t('settings.debugDescription')}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline">{t('settings.developer')}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <LogsViewer />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Error Handling Demo Tab */}
          <TabsContent value="error-demo">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-5 h-5" />
                  <div>
                    <CardTitle>Error Handling System Demo</CardTitle>
                    <CardDescription>Interactive demonstration of enhanced error handling features</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
            <ErrorHandlingDemo />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;