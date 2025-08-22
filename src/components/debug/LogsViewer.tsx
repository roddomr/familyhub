import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLogger } from '@/hooks/useLogger';
import { RefreshCw, AlertCircle, Info, AlertTriangle, Bug } from 'lucide-react';

const LogsViewer = () => {
  const { getUserLogs, getRecentErrors } = useLogger();
  const [logs, setLogs] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const [userLogs, recentErrors] = await Promise.all([
        getUserLogs(20),
        getRecentErrors()
      ]);
      setLogs(userLogs);
      setErrors(recentErrors);
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
      case 'fatal':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'warn':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
      case 'debug':
        return <Bug className="w-4 h-4 text-gray-500" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getLevelVariant = (level: string) => {
    switch (level) {
      case 'error':
      case 'fatal':
        return 'destructive';
      case 'warn':
        return 'outline';
      case 'info':
        return 'secondary';
      case 'debug':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Debug Logs</h2>
        <Button onClick={loadLogs} disabled={loading} size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Errors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Recent Errors</CardTitle>
            <CardDescription>System-wide errors in the last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              {errors.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No recent errors</p>
              ) : (
                <div className="space-y-3">
                  {errors.map((error, index) => (
                    <div key={index} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getLevelIcon(error.level)}
                          <Badge variant={getLevelVariant(error.level)}>
                            {error.level}
                          </Badge>
                          {error.module && (
                            <Badge variant="outline">{error.module}</Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(error.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{error.message}</p>
                      {error.action && (
                        <p className="text-xs text-muted-foreground">Action: {error.action}</p>
                      )}
                      {error.error_code && (
                        <p className="text-xs text-muted-foreground">Code: {error.error_code}</p>
                      )}
                      {error.details && (
                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                          {JSON.stringify(error.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* User Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Your Activity Logs</CardTitle>
            <CardDescription>Your recent application activity</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              {logs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No logs available</p>
              ) : (
                <div className="space-y-3">
                  {logs.map((log, index) => (
                    <div key={index} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getLevelIcon(log.level)}
                          <Badge variant={getLevelVariant(log.level)}>
                            {log.level}
                          </Badge>
                          {log.module && (
                            <Badge variant="outline">{log.module}</Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{log.message}</p>
                      {log.action && (
                        <p className="text-xs text-muted-foreground">Action: {log.action}</p>
                      )}
                      {log.error_code && (
                        <p className="text-xs text-muted-foreground">Code: {log.error_code}</p>
                      )}
                      {log.details && (
                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LogsViewer;