import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';
import type { DashboardData, ChartDataPoint, TimeSeriesDataPoint } from '@/types/analytics';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  account: string;
  notes?: string;
}

interface ExportOptions {
  dateRange: {
    start: string;
    end: string;
    label: string;
  };
  familyName: string;
  currency: string;
  includeCharts?: boolean;
}

// CSV Export Functions
export const exportTransactionsToCSV = (
  transactions: Transaction[],
  options: ExportOptions
): void => {
  const csvData = transactions.map(transaction => ({
    Date: formatDate(transaction.date),
    Description: transaction.description,
    Amount: formatAmount(transaction.amount, options.currency),
    Type: transaction.type === 'income' ? 'Income' : 'Expense',
    Category: transaction.category,
    Account: transaction.account,
    Notes: transaction.notes || ''
  }));

  const csv = Papa.unparse(csvData, {
    header: true,
    delimiter: ',',
    quotes: true
  });

  const filename = `${options.familyName}_Transactions_${options.dateRange.label}_${getTimestamp()}.csv`;
  downloadFile(csv, filename, 'text/csv');
};

export const exportCategoryBreakdownToCSV = (
  categories: ChartDataPoint[],
  totalAmount: number,
  options: ExportOptions
): void => {
  const csvData = categories.map(category => ({
    Category: category.label,
    Amount: formatAmount(category.value, options.currency),
    Percentage: `${category.percentage?.toFixed(2)}%`,
    'Percentage of Total': `${((category.value / totalAmount) * 100).toFixed(2)}%`
  }));

  // Add total row
  csvData.push({
    Category: 'TOTAL',
    Amount: formatAmount(totalAmount, options.currency),
    Percentage: '100.00%',
    'Percentage of Total': '100.00%'
  });

  const csv = Papa.unparse(csvData, {
    header: true,
    delimiter: ',',
    quotes: true
  });

  const filename = `${options.familyName}_Category_Breakdown_${options.dateRange.label}_${getTimestamp()}.csv`;
  downloadFile(csv, filename, 'text/csv');
};

export const exportFinancialSummaryToCSV = (
  dashboardData: DashboardData,
  options: ExportOptions
): void => {
  const summary = dashboardData.financial_summary;
  const csvData = [
    {
      Metric: 'Total Income',
      Amount: formatAmount(summary.total_income, options.currency),
      'Previous Period Change': `${summary.previous_period_comparison.income_change >= 0 ? '+' : ''}${summary.previous_period_comparison.income_change.toFixed(2)}%`
    },
    {
      Metric: 'Total Expenses',
      Amount: formatAmount(summary.total_expenses, options.currency),
      'Previous Period Change': `${summary.previous_period_comparison.expense_change >= 0 ? '+' : ''}${summary.previous_period_comparison.expense_change.toFixed(2)}%`
    },
    {
      Metric: 'Net Income',
      Amount: formatAmount(summary.net_income, options.currency),
      'Previous Period Change': `${summary.previous_period_comparison.net_change >= 0 ? '+' : ''}${summary.previous_period_comparison.net_change.toFixed(2)}%`
    }
  ];

  const csv = Papa.unparse(csvData, {
    header: true,
    delimiter: ',',
    quotes: true
  });

  const filename = `${options.familyName}_Financial_Summary_${options.dateRange.label}_${getTimestamp()}.csv`;
  downloadFile(csv, filename, 'text/csv');
};

// PDF Export Functions
export const exportTransactionsToPDF = (
  transactions: Transaction[],
  options: ExportOptions
): void => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.text(`${options.familyName} - Transaction Report`, 14, 22);
  
  doc.setFontSize(12);
  doc.text(`Period: ${options.dateRange.start} to ${options.dateRange.end}`, 14, 32);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 42);

  // Transactions table
  const tableData = transactions.map(transaction => [
    formatDate(transaction.date),
    transaction.description,
    formatAmount(transaction.amount, options.currency),
    transaction.type === 'income' ? 'Income' : 'Expense',
    transaction.category,
    transaction.account
  ]);

  doc.autoTable({
    head: [['Date', 'Description', 'Amount', 'Type', 'Category', 'Account']],
    body: tableData,
    startY: 52,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [66, 139, 202] },
    alternateRowStyles: { fillColor: [240, 240, 240] }
  });

  const filename = `${options.familyName}_Transactions_${options.dateRange.label}_${getTimestamp()}.pdf`;
  doc.save(filename);
};

export const exportFinancialSummaryToPDF = (
  dashboardData: DashboardData,
  options: ExportOptions
): void => {
  const doc = new jsPDF();
  const summary = dashboardData.financial_summary;
  
  // Header
  doc.setFontSize(18);
  doc.text(`${options.familyName} - Financial Summary`, 14, 22);
  
  doc.setFontSize(12);
  doc.text(`Period: ${options.dateRange.start} to ${options.dateRange.end}`, 14, 32);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 42);

  // Financial Summary
  doc.setFontSize(14);
  doc.text('Financial Overview', 14, 62);
  
  const summaryData = [
    ['Total Income', formatAmount(summary.total_income, options.currency), `${summary.previous_period_comparison.income_change >= 0 ? '+' : ''}${summary.previous_period_comparison.income_change.toFixed(2)}%`],
    ['Total Expenses', formatAmount(summary.total_expenses, options.currency), `${summary.previous_period_comparison.expense_change >= 0 ? '+' : ''}${summary.previous_period_comparison.expense_change.toFixed(2)}%`],
    ['Net Income', formatAmount(summary.net_income, options.currency), `${summary.previous_period_comparison.net_change >= 0 ? '+' : ''}${summary.previous_period_comparison.net_change.toFixed(2)}%`]
  ];

  doc.autoTable({
    head: [['Metric', 'Amount', 'Change from Previous Period']],
    body: summaryData,
    startY: 72,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [66, 139, 202] }
  });

  // Top Categories
  if (dashboardData.top_categories.expenses.length > 0) {
    doc.setFontSize(14);
    doc.text('Top Expense Categories', 14, doc.lastAutoTable.finalY + 20);

    const categoriesData = dashboardData.top_categories.expenses.map(category => [
      category.label,
      formatAmount(category.value, options.currency),
      `${category.percentage?.toFixed(2)}%`
    ]);

    doc.autoTable({
      head: [['Category', 'Amount', 'Percentage']],
      body: categoriesData,
      startY: doc.lastAutoTable.finalY + 30,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [220, 53, 69] }
    });
  }

  // Account Balances
  if (dashboardData.account_balances.length > 0) {
    doc.setFontSize(14);
    doc.text('Account Balances', 14, doc.lastAutoTable.finalY + 20);

    const balancesData = dashboardData.account_balances.map(account => [
      account.label,
      formatAmount(account.value, options.currency)
    ]);

    doc.autoTable({
      head: [['Account', 'Balance']],
      body: balancesData,
      startY: doc.lastAutoTable.finalY + 30,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [40, 167, 69] }
    });
  }

  const filename = `${options.familyName}_Financial_Summary_${options.dateRange.label}_${getTimestamp()}.pdf`;
  doc.save(filename);
};

export const exportComprehensiveReportToPDF = (
  dashboardData: DashboardData,
  transactions: Transaction[],
  options: ExportOptions
): void => {
  try {
    console.log('Starting PDF export with data:', { dashboardData, transactions, options });
    const doc = new jsPDF();
    const summary = dashboardData.financial_summary;
  
    // Header
    doc.setFontSize(20);
    doc.text(`${options.familyName}`, 14, 22);
    doc.setFontSize(16);
    doc.text('Comprehensive Financial Report', 14, 32);
    
    doc.setFontSize(10);
    doc.text(`Period: ${options.dateRange.start} to ${options.dateRange.end}`, 14, 42);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 48);

    // Executive Summary
    doc.setFontSize(14);
    doc.text('Executive Summary', 14, 64);
  
  const summaryData = [
    ['Total Income', formatAmount(summary.total_income, options.currency)],
    ['Total Expenses', formatAmount(summary.total_expenses, options.currency)],
    ['Net Income', formatAmount(summary.net_income, options.currency)],
    ['Savings Rate', `${summary.net_income > 0 ? ((summary.net_income / summary.total_income) * 100).toFixed(2) : '0.00'}%`],
    ['Total Transactions', transactions.length.toString()]
  ];

  doc.autoTable({
    body: summaryData,
    startY: 74,
    styles: { fontSize: 9 },
    theme: 'plain',
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { cellWidth: 50 }
    }
  });

  // Income vs Expenses Breakdown
  doc.addPage();
  doc.setFontSize(14);
  doc.text('Income vs Expenses Analysis', 14, 22);

  const incomeTransactions = transactions.filter(t => t.type === 'income');
  const expenseTransactions = transactions.filter(t => t.type === 'expense');

  const analysisData = [
    ['Income Transactions', incomeTransactions.length.toString()],
    ['Average Income per Transaction', incomeTransactions.length > 0 ? formatAmount(summary.total_income / incomeTransactions.length, options.currency) : formatAmount(0, options.currency)],
    ['Expense Transactions', expenseTransactions.length.toString()],
    ['Average Expense per Transaction', expenseTransactions.length > 0 ? formatAmount(summary.total_expenses / expenseTransactions.length, options.currency) : formatAmount(0, options.currency)]
  ];

  doc.autoTable({
    body: analysisData,
    startY: 32,
    styles: { fontSize: 9 },
    theme: 'plain',
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { cellWidth: 50 }
    }
  });

  // Recent Transactions (Last 20)
  if (transactions.length > 0) {
    doc.setFontSize(14);
    doc.text('Recent Transactions (Last 20)', 14, doc.lastAutoTable.finalY + 20);

    const recentTransactions = transactions.slice(0, 20);
    const transactionData = recentTransactions.map(transaction => [
      formatDate(transaction.date),
      transaction.description.substring(0, 30) + (transaction.description.length > 30 ? '...' : ''),
      formatAmount(transaction.amount, options.currency),
      transaction.type === 'income' ? 'Inc' : 'Exp',
      transaction.category.substring(0, 15)
    ]);

    doc.autoTable({
      head: [['Date', 'Description', 'Amount', 'Type', 'Category']],
      body: transactionData,
      startY: doc.lastAutoTable.finalY + 30,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [66, 139, 202] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 60 },
        2: { cellWidth: 30 },
        3: { cellWidth: 15 },
        4: { cellWidth: 35 }
      }
    });
  }

  const filename = `${options.familyName}_Comprehensive_Report_${options.dateRange.label}_${getTimestamp()}.pdf`;
    console.log('Attempting to save PDF with filename:', filename);
    doc.save(filename);
    console.log('PDF export completed successfully');
  } catch (error) {
    console.error('PDF export failed:', error);
    throw error;
  }
};

// Utility Functions
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

const formatAmount = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

const getTimestamp = (): string => {
  const now = new Date();
  return now.toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_');
};

const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Export presets for different report types
export const ExportPresets = {
  TAX_REPORT: {
    name: 'Tax Report',
    includeTransactions: true,
    includeSummary: true,
    includeCategories: true,
    format: 'pdf' as const
  },
  MONTHLY_SUMMARY: {
    name: 'Monthly Summary',
    includeTransactions: false,
    includeSummary: true,
    includeCategories: true,
    format: 'pdf' as const
  },
  TRANSACTION_EXPORT: {
    name: 'Transaction Export',
    includeTransactions: true,
    includeSummary: false,
    includeCategories: false,
    format: 'csv' as const
  },
  COMPREHENSIVE: {
    name: 'Comprehensive Report',
    includeTransactions: true,
    includeSummary: true,
    includeCategories: true,
    format: 'pdf' as const
  }
};