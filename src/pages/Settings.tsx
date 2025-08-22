import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import LogsViewer from '@/components/debug/LogsViewer';
import { 
  User, 
  Shield, 
  Bell, 
  Palette, 
  Database,
  LogOut,
  Settings as SettingsIcon 
} from 'lucide-react';

const Settings = () => {
  const { user, signOut } = useAuth();
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
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-text-secondary mt-1">
              Manage your account and application preferences
            </p>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="debug">Debug</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5" />
                  <div>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Manage your personal information</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">User ID</label>
                    <p className="text-sm text-muted-foreground mt-1 font-mono">{user?.id}</p>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <Button variant="outline" onClick={handleSignOut} disabled={loading}>
                    <LogOut className="w-4 h-4 mr-2" />
                    {loading ? 'Signing out...' : 'Sign Out'}
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
                    <CardTitle>Security Settings</CardTitle>
                    <CardDescription>Manage your account security</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Security settings will be available soon.</p>
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
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>Control how you receive notifications</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Notification settings will be available soon.</p>
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
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>Customize the look and feel</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Theme and appearance settings will be available soon.</p>
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
                      <CardTitle>Debug Information</CardTitle>
                      <CardDescription>Application logs and debugging tools</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline">Developer</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <LogsViewer />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;