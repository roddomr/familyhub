import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFamily } from '@/hooks/useFamily';
import { useLogger } from '@/hooks/useLogger';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { LoadingButton } from '@/components/ui/loading-states';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Download,
  FileText,
  FileSpreadsheet,
  Calendar,
  DollarSign,
  PieChart,
  BarChart3,
  CheckCircle
} from 'lucide-react';
import {
  exportTransactionsToCSV,
  exportTransactionsToPDF,
  exportFinancialSummaryToPDF,
  exportCategoryBreakdownToCSV,
  exportComprehensiveReportToPDF,
  ExportPresets
} from '@/lib/exportUtils';
import type { DashboardData, DateRange } from '@/types/analytics';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  transaction_categories?: {
    name: string;
    color?: string;
  };
  financial_accounts?: {
    name: string;
  };
}

interface ExportDialogProps {
  dashboardData?: DashboardData;
  transactions: Transaction[];
  dateRange: DateRange;
  trigger?: React.ReactNode;
}

interface ExportConfig {
  format: 'pdf' | 'csv';
  reportType: 'transactions' | 'summary' | 'categories' | 'comprehensive';
  includeCharts: boolean;
  dateRangeLabel: string;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  dashboardData,
  transactions,
  dateRange,
  trigger
}) => {
  const { t } = useTranslation();
  const { currentFamily } = useFamily();
  const { logInfo, logError } = useLogger();
  
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    format: 'pdf',
    reportType: 'comprehensive',
    includeCharts: false,
    dateRangeLabel: getDateRangeLabel(dateRange)
  });

  const reportTypes = [
    {
      id: 'comprehensive',
      name: t('analytics.export.comprehensiveReport'),
      description: t('analytics.export.comprehensiveDescription'),
      icon: FileText,
      formats: ['pdf'],
      badge: t('analytics.export.recommended')
    },
    {
      id: 'transactions',
      name: t('analytics.export.transactionReport'),
      description: t('analytics.export.transactionDescription'),
      icon: BarChart3,
      formats: ['pdf', 'csv']
    },
    {
      id: 'summary',
      name: t('analytics.export.financialSummary'),
      description: t('analytics.export.summaryDescription'),
      icon: DollarSign,
      formats: ['pdf']
    },
    {
      id: 'categories',
      name: t('analytics.export.categoryBreakdown'),
      description: t('analytics.export.categoryDescription'),
      icon: PieChart,
      formats: ['csv']
    }
  ];

  const getDateRangeOptions = () => ({
    start: getDateRangeBoundaries(dateRange).start,
    end: getDateRangeBoundaries(dateRange).end,
    label: getDateRangeLabel(dateRange)
  });

  const handleExport = async () => {
    if (!currentFamily || !dashboardData) return;

    setExporting(true);
    
    try {
      const dateRangeOptions = getDateRangeOptions();
      const exportOptions = {
        dateRange: dateRangeOptions,
        familyName: currentFamily.name,
        currency: 'USD', // TODO: Get from family settings
        includeCharts: exportConfig.includeCharts
      };

      // Prepare transactions data
      const processedTransactions = transactions.map(t => ({
        id: t.id,
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
        category: t.transaction_categories?.name || 'Uncategorized',
        account: t.financial_accounts?.name || 'Unknown',
        notes: ''
      }));

      await logInfo('Starting export', {
        family_id: currentFamily.id,
        report_type: exportConfig.reportType,
        format: exportConfig.format,
        transactions_count: processedTransactions.length
      }, 'analytics', 'export');

      switch (exportConfig.reportType) {
        case 'transactions':
          if (exportConfig.format === 'csv') {
            exportTransactionsToCSV(processedTransactions, exportOptions);
          } else {
            exportTransactionsToPDF(processedTransactions, exportOptions);
          }
          break;

        case 'summary':
          exportFinancialSummaryToPDF(dashboardData, exportOptions);
          break;

        case 'categories':
          exportCategoryBreakdownToCSV(
            dashboardData.top_categories.expenses,
            dashboardData.financial_summary.total_expenses,
            exportOptions
          );
          break;

        case 'comprehensive':
          console.log('About to call exportComprehensiveReportToPDF with:', {
            dashboardData,
            processedTransactions,
            exportOptions
          });
          exportComprehensiveReportToPDF(dashboardData, processedTransactions, exportOptions);
          break;

        default:
          throw new Error('Unknown report type');
      }

      await logInfo('Export completed successfully', {
        family_id: currentFamily.id,
        report_type: exportConfig.reportType,
        format: exportConfig.format
      }, 'analytics', 'export');

      setOpen(false);

    } catch (error) {
      console.error('Export failed:', error);
      console.error('Error details:', {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack
      });
      await logError('Export failed', error as Error, {
        family_id: currentFamily.id,
        report_type: exportConfig.reportType,
        format: exportConfig.format,
        error_name: (error as Error).name,
        error_message: (error as Error).message
      }, 'analytics', 'export');
    } finally {
      setExporting(false);
    }
  };

  const selectedReportType = reportTypes.find(type => type.id === exportConfig.reportType);
  const availableFormats = selectedReportType?.formats || ['pdf'];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            {t('analytics.export.exportData')}
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            {t('analytics.export.exportFinancialData')}
          </DialogTitle>
          <DialogDescription>
            {t('analytics.export.selectReportOptions')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Report Type Selection */}
          <div>
            <Label className="text-base font-medium mb-3 block">
              {t('analytics.export.reportType')}
            </Label>
            <div className="grid grid-cols-1 gap-3">
              {reportTypes.map(type => {
                const Icon = type.icon;
                return (
                  <Card
                    key={type.id}
                    className={`cursor-pointer transition-colors ${
                      exportConfig.reportType === type.id
                        ? 'ring-2 ring-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setExportConfig(prev => ({
                      ...prev,
                      reportType: type.id as any,
                      format: type.formats.includes(prev.format) ? prev.format : type.formats[0] as any
                    }))}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{type.name}</h4>
                            {type.badge && (
                              <Badge variant="secondary" className="text-xs">
                                {type.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{type.description}</p>
                          <div className="flex items-center gap-1 mt-2">
                            {type.formats.includes('pdf') && (
                              <Badge variant="outline" className="text-xs">
                                <FileText className="w-3 h-3 mr-1" />
                                PDF
                              </Badge>
                            )}
                            {type.formats.includes('csv') && (
                              <Badge variant="outline" className="text-xs">
                                <FileSpreadsheet className="w-3 h-3 mr-1" />
                                CSV
                              </Badge>
                            )}
                          </div>
                        </div>
                        {exportConfig.reportType === type.id && (
                          <CheckCircle className="w-5 h-5 text-primary mt-1" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Format Selection */}
          {availableFormats.length > 1 && (
            <div>
              <Label className="text-base font-medium mb-3 block">
                {t('analytics.export.format')}
              </Label>
              <RadioGroup
                value={exportConfig.format}
                onValueChange={(value: 'pdf' | 'csv') => 
                  setExportConfig(prev => ({ ...prev, format: value }))
                }
                className="flex gap-4"
              >
                {availableFormats.map(format => (
                  <div key={format} className="flex items-center space-x-2">
                    <RadioGroupItem value={format} id={format} />
                    <Label htmlFor={format} className="flex items-center gap-2">
                      {format === 'pdf' ? (
                        <FileText className="w-4 h-4" />
                      ) : (
                        <FileSpreadsheet className="w-4 h-4" />
                      )}
                      {format.toUpperCase()}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Date Range Info */}
          <div>
            <Label className="text-base font-medium mb-2 block">
              {t('analytics.export.dateRange')}
            </Label>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                {getDateRangeOptions().start} - {getDateRangeOptions().end}
              </span>
              <Badge variant="secondary" className="ml-auto">
                {exportConfig.dateRangeLabel}
              </Badge>
            </div>
          </div>

          {/* Data Summary */}
          <div>
            <Label className="text-base font-medium mb-2 block">
              {t('analytics.export.dataIncluded')}
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted rounded-lg text-center">
                <div className="text-2xl font-bold text-primary">{transactions.length}</div>
                <div className="text-sm text-muted-foreground">{t('analytics.transactions')}</div>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">
                  {dashboardData?.top_categories.expenses.length || 0}
                </div>
                <div className="text-sm text-muted-foreground">{t('analytics.categories')}</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <LoadingButton
              loading={exporting}
              loadingText={t('analytics.export.generating')}
              onClick={handleExport}
              disabled={!currentFamily || !dashboardData || transactions.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              {t('analytics.export.generateReport')}
            </LoadingButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Helper functions
function getDateRangeLabel(range: DateRange): string {
  const labels: Record<DateRange, string> = {
    'last_7_days': 'Last 7 Days',
    'last_30_days': 'Last 30 Days',
    'last_90_days': 'Last 90 Days',
    'last_year': 'Last Year',
    'current_month': 'Current Month',
    'current_year': 'Current Year'
  };
  return labels[range] || 'Custom Range';
}

function getDateRangeBoundaries(range: DateRange) {
  const now = new Date();
  const start = new Date();
  
  switch (range) {
    case 'last_7_days':
      start.setDate(now.getDate() - 7);
      break;
    case 'last_30_days':
      start.setDate(now.getDate() - 30);
      break;
    case 'last_90_days':
      start.setDate(now.getDate() - 90);
      break;
    case 'last_year':
      start.setFullYear(now.getFullYear() - 1);
      break;
    case 'current_month':
      start.setDate(1);
      break;
    case 'current_year':
      start.setMonth(0, 1);
      break;
    default:
      start.setDate(now.getDate() - 30);
  }
  
  return {
    start: start.toISOString().split('T')[0],
    end: now.toISOString().split('T')[0]
  };
}