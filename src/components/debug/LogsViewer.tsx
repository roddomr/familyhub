import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLogger } from '@/hooks/useLogger';
import { RefreshCw, AlertCircle, Info, AlertTriangle, Bug } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LogsViewer = () => {
  const { t } = useTranslation();
  const { getUserLogs, getRecentErrors, logInfo, logError } = useLogger();
  const [logs, setLogs] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const [userLogs, recentErrors] = await Promise.all([
        getUserLogs(50),
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

  const testLogging = async () => {
    console.log('🧪 Testing logging system...');
    try {
      await logInfo('Test log message', { test: true }, 'debug', 'test_logging');
      await logError('Test error message', { test: true }, 'debug', 'test_logging', 'TEST_ERROR');
      setTimeout(() => loadLogs(), 1000); // Reload logs after 1 second
    } catch (error) {
      console.error('Failed to test logging:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t('finance.debugLogs')}</h2>
        <div className="flex space-x-2">
          <Button onClick={testLogging} variant="outline" size="sm">
            {t('finance.testLogging')}
          </Button>
          <Button onClick={loadLogs} disabled={loading} size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('finance.refresh')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Errors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">{t('finance.recentErrors')}</CardTitle>
            <CardDescription>{t('finance.systemWideErrorsLast24Hours')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-96 overflow-auto border rounded-md p-2">
              {errors.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">{t('finance.noRecentErrors')}</p>
              ) : (
                <div className="space-y-3">
                  {errors.map((error, index) => (
                    <div key={index} className="border rounded-lg p-3 space-y-2 overflow-x-auto">
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
                        <div className="text-xs text-foreground bg-gray-100 px-2 py-1 rounded border">
                          📅 {new Date(error.created_at).toLocaleDateString()}<br/>
                          ⏰ {new Date(error.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                      <p className="text-sm font-medium">{error.message}</p>
                      {error.action && (
                        <p className="text-xs text-muted-foreground">{t('finance.action')}: {error.action}</p>
                      )}
                      {error.error_code && (
                        <p className="text-xs text-muted-foreground">{t('finance.code')}: {error.error_code}</p>
                      )}
                      {error.details && (
                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                          {typeof error.details === 'string' 
                            ? error.details 
                            : JSON.stringify(error.details, null, 2)
                          }
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User Logs */}
        <Card>
          <CardHeader>
            <CardTitle>{t('finance.yourActivityLogs')}</CardTitle>
            <CardDescription>{t('finance.yourRecentApplicationActivity')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-96 overflow-auto border rounded-md p-2">
              {logs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">{t('finance.noLogsAvailable')}</p>
              ) : (
                <div className="space-y-3">
                  {logs.map((log, index) => (
                    <div key={index} className="border rounded-lg p-3 space-y-2 overflow-x-auto">
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
                        <div className="text-xs text-foreground bg-gray-100 px-2 py-1 rounded border">
                          📅 {new Date(log.created_at).toLocaleDateString()}<br/>
                          ⏰ {new Date(log.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                      <p className="text-sm font-medium">{log.message}</p>
                      {log.action && (
                        <p className="text-xs text-muted-foreground">{t('finance.action')}: {log.action}</p>
                      )}
                      {log.error_code && (
                        <p className="text-xs text-muted-foreground">{t('finance.code')}: {log.error_code}</p>
                      )}
                      {log.details && (
                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                          {typeof log.details === 'string' 
                            ? log.details 
                            : JSON.stringify(log.details, null, 2)
                          }
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LogsViewer;