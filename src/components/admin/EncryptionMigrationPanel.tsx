/**
 * Encryption Migration Panel
 * Administrative interface for migrating existing data to encrypted format
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Shield, 
  Lock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  Database,
  Users,
  CreditCard,
  Activity
} from 'lucide-react';
import { useFamily } from '@/hooks/useFamily';
import { useEncryption } from '@/hooks/useEncryption';
import { migrateCurrentFamilyData, type EncryptionMigrator } from '@/utils/encryptionMigration';
import { useTranslation } from 'react-i18next';

interface MigrationProgress {
  stage: string;
  current: number;
  total: number;
  percentage: number;
  currentItem?: string;
}

interface MigrationResult {
  success: boolean;
  processed: number;
  encrypted: number;
  failed: number;
  errors: string[];
  durationMs: number;
}

export const EncryptionMigrationPanel = () => {
  const { t } = useTranslation();
  const { currentFamily } = useFamily();
  const { getEncryptionHealth, isReady } = useEncryption();
  
  const [migrationInProgress, setMigrationInProgress] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [results, setResults] = useState<any>(null);
  const [healthData, setHealthData] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  React.useEffect(() => {
    if (isReady) {
      loadHealthData();
    }
  }, [isReady, getEncryptionHealth]);

  const loadHealthData = async () => {
    try {
      const health = await getEncryptionHealth();
      setHealthData(health);
    } catch (error) {
      console.error('Failed to load encryption health:', error);
    }
  };

  const handleStartMigration = async () => {
    if (!currentFamily) return;

    setMigrationInProgress(true);
    setProgress(null);
    setResults(null);
    setShowResults(false);

    try {
      const migrationResults = await migrateCurrentFamilyData((progressUpdate) => {
        setProgress(progressUpdate);
      });

      setResults(migrationResults);
      setShowResults(true);
      await loadHealthData(); // Refresh health data
    } catch (error: any) {
      setResults({
        success: false,
        summary: {
          totalProcessed: 0,
          totalEncrypted: 0,
          totalFailed: 1,
          totalErrors: [error.message],
          durationMs: 0
        }
      });
      setShowResults(true);
    } finally {
      setMigrationInProgress(false);
      setProgress(null);
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'FULLY_ENCRYPTED': return 'bg-green-500';
      case 'MOSTLY_ENCRYPTED': return 'bg-blue-500';
      case 'PARTIALLY_ENCRYPTED': return 'bg-yellow-500';
      case 'MINIMALLY_ENCRYPTED': return 'bg-orange-500';
      case 'NOT_ENCRYPTED': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'FULLY_ENCRYPTED': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'MOSTLY_ENCRYPTED': return <Shield className="h-4 w-4 text-blue-600" />;
      case 'PARTIALLY_ENCRYPTED': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'MINIMALLY_ENCRYPTED': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'NOT_ENCRYPTED': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTableIcon = (tableName: string) => {
    switch (tableName) {
      case 'financial_accounts': return <CreditCard className="h-4 w-4" />;
      case 'transactions': return <Database className="h-4 w-4" />;
      case 'profiles': return <Users className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (!currentFamily) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Family Required</AlertTitle>
        <AlertDescription>
          You must be part of a family to access encryption settings.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Data Encryption Migration</h2>
          <p className="text-muted-foreground">
            Secure your financial data with AES-256 encryption
          </p>
        </div>
      </div>

      {/* Encryption Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Encryption Health Status
          </CardTitle>
          <CardDescription>
            Current encryption status of your family's financial data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {healthData.map((table, index) => (
            <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {getTableIcon(table.tableName)}
                <div>
                  <p className="font-medium capitalize">
                    {table.tableName.replace('_', ' ')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {table.encryptedRecords} of {table.totalRecords} records encrypted
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-medium">{table.encryptionPercentage}%</p>
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${getHealthStatusColor(table.healthStatus)}`}
                      style={{ width: `${table.encryptionPercentage}%` }}
                    />
                  </div>
                </div>
                <Badge variant="outline" className="flex items-center gap-1">
                  {getHealthStatusIcon(table.healthStatus)}
                  {table.healthStatus.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Migration Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Start Migration
          </CardTitle>
          <CardDescription>
            Encrypt all unencrypted financial data for maximum security
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!migrationInProgress && !showResults && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Important Security Notice</AlertTitle>
                <AlertDescription>
                  This process will encrypt all your family's financial data using AES-256 encryption.
                  Once encrypted, data can only be accessed with the proper encryption keys.
                  Make sure to backup your encryption keys securely.
                </AlertDescription>
              </Alert>

              <Button 
                onClick={handleStartMigration}
                disabled={!isReady}
                className="w-full"
                size="lg"
              >
                <Lock className="h-4 w-4 mr-2" />
                Start Encryption Migration
              </Button>
            </div>
          )}

          {/* Progress Display */}
          {migrationInProgress && progress && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{progress.stage}</p>
                  <span className="text-sm text-muted-foreground">
                    {progress.current} / {progress.total}
                  </span>
                </div>
                <Progress value={progress.percentage} className="w-full" />
                {progress.currentItem && (
                  <p className="text-sm text-muted-foreground">
                    Processing: {progress.currentItem}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Results Display */}
          {showResults && results && (
            <div className="space-y-4">
              <Separator />
              
              <div className="flex items-center gap-2">
                {results.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <h3 className="font-semibold">
                  Migration {results.success ? 'Completed Successfully' : 'Failed'}
                </h3>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary">
                    {results.summary.totalProcessed}
                  </p>
                  <p className="text-sm text-muted-foreground">Processed</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {results.summary.totalEncrypted}
                  </p>
                  <p className="text-sm text-muted-foreground">Encrypted</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-red-600">
                    {results.summary.totalFailed}
                  </p>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">
                    {formatDuration(results.summary.durationMs)}
                  </p>
                  <p className="text-sm text-muted-foreground">Duration</p>
                </div>
              </div>

              {/* Detailed Results */}
              <div className="space-y-3">
                <h4 className="font-medium">Detailed Results:</h4>
                
                {Object.entries(results.results).map(([key, result]: [string, any]) => (
                  <div key={key} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <p className="font-medium capitalize">{key.replace('_', ' ')}</p>
                      <Badge variant={result.success ? "default" : "destructive"}>
                        {result.success ? 'Success' : 'Failed'}
                      </Badge>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Processed: {result.processed} | Encrypted: {result.encrypted} | Failed: {result.failed}
                    </div>
                    {result.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-red-600">Errors:</p>
                        <ul className="text-xs text-red-600 mt-1">
                          {result.errors.slice(0, 3).map((error: string, i: number) => (
                            <li key={i}>• {error}</li>
                          ))}
                          {result.errors.length > 3 && (
                            <li>• ... and {result.errors.length - 3} more errors</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Button 
                onClick={() => setShowResults(false)}
                variant="outline"
                className="w-full"
              >
                Close Results
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EncryptionMigrationPanel;