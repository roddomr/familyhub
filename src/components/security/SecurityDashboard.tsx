/**
 * Security Dashboard component for monitoring financial security
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  Shield,
  Eye,
  Clock,
  TrendingUp,
  Users,
  Activity,
  FileText,
  RefreshCw
} from 'lucide-react';
import { useFamily } from '@/hooks/useFamily';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useAuditLog } from '@/hooks/useAuditLog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface SecurityDashboardProps {
  className?: string;
}

interface SecurityMetrics {
  total_operations: number;
  critical_operations: number;
  high_risk_operations: number;
  operations_last_24h: number;
  high_risk_last_24h: number;
  last_operation: string | null;
  avg_amount_involved: number;
}

interface AuditLogEntry {
  id: string;
  action: string;
  table_name: string;
  risk_level: string;
  amount_involved: number;
  operation_context: string;
  created_at: string;
  user_id: string;
  ip_address: string;
  user_agent: string;
}

export const SecurityDashboard: React.FC<SecurityDashboardProps> = ({
  className
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentFamily } = useFamily();
  const { getSecurityDashboard, getAuditHistory } = useAuditLog();

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLogEntry[]>([]);
  const [criticalLogs, setCriticalLogs] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    if (currentFamily) {
      loadSecurityData();
    }
  }, [currentFamily]);

  const loadSecurityData = async () => {
    if (!currentFamily) return;

    setLoading(true);
    try {
      // Load security metrics
      const dashboardData = await getSecurityDashboard();
      setMetrics(dashboardData);

      // Load recent audit logs
      const recent = await getAuditHistory({
        limit: 50,
        start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // Last 7 days
      });
      setRecentLogs(recent);

      // Load critical operations
      const critical = await getAuditHistory({
        risk_level: 'CRITICAL',
        limit: 20,
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // Last 30 days
      });
      setCriticalLogs(critical);

    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'LOW':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <TrendingUp className="w-4 h-4" />;
      case 'UPDATE':
        return <FileText className="w-4 h-4" />;
      case 'DELETE':
        return <AlertTriangle className="w-4 h-4" />;
      case 'LOGIN':
      case 'LOGOUT':
        return <Users className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Security Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Operations</p>
                <p className="text-2xl font-bold">{metrics?.total_operations || 0}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical Operations</p>
                <p className="text-2xl font-bold text-red-600">{metrics?.critical_operations || 0}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last 24 Hours</p>
                <p className="text-2xl font-bold">{metrics?.operations_last_24h || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Amount</p>
                <p className="text-2xl font-bold">
                  ${(metrics?.avg_amount_involved || 0).toFixed(2)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Security Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Activity
              </CardTitle>
              <CardDescription>
                Monitor and review all financial security events
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadSecurityData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="recent" className="w-full">
            <TabsList>
              <TabsTrigger value="recent">Recent Activity</TabsTrigger>
              <TabsTrigger value="critical">Critical Events</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="recent" className="space-y-4">
              <div className="space-y-2">
                {recentLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No recent security events
                  </p>
                ) : (
                  recentLogs.slice(0, 10).map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        {getActionIcon(log.action)}
                        <div>
                          <p className="font-medium">
                            {log.action} on {log.table_name.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {log.operation_context && `Context: ${log.operation_context}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {log.amount_involved > 0 && (
                          <span className="text-sm font-medium">
                            ${log.amount_involved.toFixed(2)}
                          </span>
                        )}
                        <Badge className={getRiskLevelColor(log.risk_level)}>
                          {log.risk_level}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), 'MMM dd, HH:mm')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="critical" className="space-y-4">
              <div className="space-y-2">
                {criticalLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No critical security events
                  </p>
                ) : (
                  criticalLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50 dark:bg-red-950 dark:border-red-800"
                    >
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <div>
                          <p className="font-medium text-red-900 dark:text-red-100">
                            CRITICAL: {log.action} on {log.table_name.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-red-700 dark:text-red-300">
                            {log.operation_context}
                          </p>
                          {log.ip_address && (
                            <p className="text-xs text-red-600 dark:text-red-400">
                              IP: {log.ip_address}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {log.amount_involved > 0 && (
                          <span className="text-sm font-bold text-red-800 dark:text-red-200">
                            ${log.amount_involved.toFixed(2)}
                          </span>
                        )}
                        <span className="text-xs text-red-600 dark:text-red-400">
                          {format(new Date(log.created_at), 'MMM dd, HH:mm')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="summary" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Risk Distribution</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-950 rounded">
                      <span>Low Risk</span>
                      <Badge className={getRiskLevelColor('LOW')}>
                        {recentLogs.filter(l => l.risk_level === 'LOW').length}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-yellow-50 dark:bg-yellow-950 rounded">
                      <span>Medium Risk</span>
                      <Badge className={getRiskLevelColor('MEDIUM')}>
                        {recentLogs.filter(l => l.risk_level === 'MEDIUM').length}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-orange-50 dark:bg-orange-950 rounded">
                      <span>High Risk</span>
                      <Badge className={getRiskLevelColor('HIGH')}>
                        {recentLogs.filter(l => l.risk_level === 'HIGH').length}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-red-50 dark:bg-red-950 rounded">
                      <span>Critical Risk</span>
                      <Badge className={getRiskLevelColor('CRITICAL')}>
                        {recentLogs.filter(l => l.risk_level === 'CRITICAL').length}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Recent Activity Types</h4>
                  <div className="space-y-2">
                    {['CREATE', 'UPDATE', 'DELETE', 'VIEW'].map(action => {
                      const count = recentLogs.filter(l => l.action === action).length;
                      return (
                        <div key={action} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                          <span className="flex items-center gap-2">
                            {getActionIcon(action)}
                            {action}
                          </span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityDashboard;