import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useFamilyInsights } from '../useFamilyInsights';
import { supabase } from '@/lib/supabase';

// Mock the dependencies
vi.mock('@/lib/supabase');
vi.mock('@/contexts/AuthContext');
vi.mock('@/hooks/useFamily');
vi.mock('@/hooks/useLogger');
vi.mock('@/hooks/useEnhancedToast');

const mockSupabase = vi.mocked(supabase);
const mockAuth = { user: { id: 'test-user-id' } };
const mockFamily = { currentFamily: { id: 'test-family-id' } };
const mockLogger = { logInfo: vi.fn(), logError: vi.fn() };
const mockToast = { 
  apiError: vi.fn(), 
  loading: vi.fn(), 
  success: vi.fn() 
};

// Mock the context hooks
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuth
}));

vi.mock('@/hooks/useFamily', () => ({
  useFamily: () => mockFamily
}));

vi.mock('@/hooks/useLogger', () => ({
  useLogger: () => mockLogger
}));

vi.mock('@/hooks/useEnhancedToast', () => ({
  useEnhancedToast: () => mockToast
}));

describe('useFamilyInsights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockMemberSpendingData = [
    {
      user_id: 'user-1',
      full_name: 'John Doe',
      role: 'admin',
      total_expenses: 1500,
      total_income: 3000,
      transaction_count: 25,
      avg_transaction_amount: 60,
      most_used_category: 'Food',
      spending_trend: 5.5,
      category_breakdown: { Food: 500, Transport: 300 }
    },
    {
      user_id: 'user-2',
      full_name: 'Jane Doe',
      role: 'parent',
      total_expenses: 800,
      total_income: 2000,
      transaction_count: 15,
      avg_transaction_amount: 53.33,
      most_used_category: 'Shopping',
      spending_trend: -2.1,
      category_breakdown: { Shopping: 400, Entertainment: 200 }
    }
  ];

  const mockSharedVsIndividualData = [
    {
      analysis_type: 'shared',
      total_amount: 800,
      transaction_count: 12,
      avg_amount: 66.67,
      percentage_of_total: 60,
      top_categories: { Groceries: 500, Utilities: 300 }
    },
    {
      analysis_type: 'individual',
      total_amount: 533.33,
      transaction_count: 8,
      avg_amount: 66.67,
      percentage_of_total: 40,
      top_categories: { Entertainment: 300, Personal: 233.33 }
    }
  ];

  const mockSpendingComparisonData = [
    {
      comparison_metric: 'total_expenses',
      member_name: 'John Doe',
      member_role: 'admin',
      value: 1500,
      rank_position: 1,
      percentage_of_family_total: 65.2
    }
  ];

  const mockHealthInsightsData = [
    {
      insight_type: 'savings_rate',
      insight_title: 'Family Savings Rate',
      insight_description: 'Your family is saving 20% of income',
      impact_level: 'low',
      recommended_action: 'Keep up the good work',
      supporting_data: { savings_rate_percent: 20 }
    }
  ];

  describe('fetchInsights', () => {
    it('should fetch family insights successfully', async () => {
      mockSupabase.rpc = vi.fn()
        .mockResolvedValueOnce({ data: mockMemberSpendingData, error: null })
        .mockResolvedValueOnce({ data: mockSharedVsIndividualData, error: null })
        .mockResolvedValueOnce({ data: mockSpendingComparisonData, error: null })
        .mockResolvedValueOnce({ data: mockHealthInsightsData, error: null });

      const { result } = renderHook(() => useFamilyInsights({
        autoFetch: false
      }));

      await waitFor(() => {
        result.current.fetchInsights();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual({
        memberSpending: mockMemberSpendingData.map(member => ({
          ...member,
          total_expenses: 1500,
          total_income: member.user_id === 'user-1' ? 3000 : 2000,
          transaction_count: member.user_id === 'user-1' ? 25 : 15,
          avg_transaction_amount: member.user_id === 'user-1' ? 60 : 53.33,
          spending_trend: member.user_id === 'user-1' ? 5.5 : -2.1
        })),
        sharedVsIndividual: mockSharedVsIndividualData.map(item => ({
          ...item,
          total_amount: item.analysis_type === 'shared' ? 800 : 533.33,
          transaction_count: item.analysis_type === 'shared' ? 12 : 8,
          avg_amount: 66.67,
          percentage_of_total: item.analysis_type === 'shared' ? 60 : 40
        })),
        spendingComparison: mockSpendingComparisonData,
        financialHealthInsights: mockHealthInsightsData,
        period: {
          start: expect.any(String),
          end: expect.any(String),
          label: expect.any(String)
        },
        familyTotals: {
          totalIncome: 5000,
          totalExpenses: 2300,
          memberCount: 2,
          transactionCount: 40,
          netIncome: 2700,
          avgMemberExpenses: 1150
        }
      });

      // Verify all RPC calls were made
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_family_spending_patterns', expect.any(Object));
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_shared_vs_individual_expenses', expect.any(Object));
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_family_spending_comparison', expect.any(Object));
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_family_financial_health_insights', expect.any(Object));
    });

    it('should handle API errors gracefully', async () => {
      const mockError = new Error('Database connection failed');
      mockSupabase.rpc = vi.fn().mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useFamilyInsights({
        autoFetch: false
      }));

      await waitFor(() => {
        result.current.fetchInsights();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Database connection failed');
      expect(mockToast.apiError).toHaveBeenCalledWith(mockError, 'fetching family insights');
      expect(mockLogger.logError).toHaveBeenCalledWith(
        'Failed to fetch family insights',
        mockError,
        expect.any(Object),
        'analytics',
        'family-insights'
      );
    });

    it('should handle partial API failures', async () => {
      mockSupabase.rpc = vi.fn()
        .mockResolvedValueOnce({ data: mockMemberSpendingData, error: null })
        .mockRejectedValueOnce(new Error('Shared vs individual failed'))
        .mockResolvedValueOnce({ data: mockSpendingComparisonData, error: null })
        .mockResolvedValueOnce({ data: mockHealthInsightsData, error: null });

      const { result } = renderHook(() => useFamilyInsights({
        autoFetch: false
      }));

      await waitFor(() => {
        result.current.fetchInsights();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Shared vs individual failed');
    });
  });

  describe('calculateFamilyTotals', () => {
    it('should calculate family totals correctly', async () => {
      mockSupabase.rpc = vi.fn()
        .mockResolvedValueOnce({ data: mockMemberSpendingData, error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      const { result } = renderHook(() => useFamilyInsights({
        autoFetch: false
      }));

      await waitFor(() => {
        result.current.fetchInsights();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data?.familyTotals).toEqual({
        totalIncome: 5000, // 3000 + 2000
        totalExpenses: 2300, // 1500 + 800
        memberCount: 2,
        transactionCount: 40, // 25 + 15
        netIncome: 2700, // 5000 - 2300
        avgMemberExpenses: 1150 // 2300 / 2
      });
    });

    it('should handle empty member data', async () => {
      mockSupabase.rpc = vi.fn()
        .mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useFamilyInsights({
        autoFetch: false
      }));

      await waitFor(() => {
        result.current.fetchInsights();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data?.familyTotals).toEqual({
        totalIncome: 0,
        totalExpenses: 0,
        memberCount: 0,
        transactionCount: 0,
        netIncome: 0,
        avgMemberExpenses: 0
      });
    });
  });

  describe('formatDateRangeLabel', () => {
    it('should format date range labels correctly', async () => {
      mockSupabase.rpc = vi.fn()
        .mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useFamilyInsights({
        dateRange: {
          start: '2023-01-01',
          end: '2023-01-07'
        },
        autoFetch: false
      }));

      await waitFor(() => {
        result.current.fetchInsights({ start: '2023-01-01', end: '2023-01-07' });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data?.period.label).toBe('Last 7 Days');
    });

    it('should handle long date ranges', async () => {
      mockSupabase.rpc = vi.fn()
        .mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useFamilyInsights({
        dateRange: {
          start: '2022-01-01',
          end: '2023-12-31'
        },
        autoFetch: false
      }));

      await waitFor(() => {
        result.current.fetchInsights({ start: '2022-01-01', end: '2023-12-31' });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data?.period.label).toBe('Jan 2022 - Dec 2023');
    });
  });

  describe('data processing edge cases', () => {
    it('should handle null and undefined values gracefully', async () => {
      const corruptedData = [
        {
          user_id: 'user-1',
          full_name: null,
          role: undefined,
          total_expenses: 'invalid',
          total_income: null,
          transaction_count: undefined,
          avg_transaction_amount: '50.5',
          most_used_category: null,
          spending_trend: 'invalid',
          category_breakdown: null
        }
      ];

      mockSupabase.rpc = vi.fn()
        .mockResolvedValueOnce({ data: corruptedData, error: null })
        .mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useFamilyInsights({
        autoFetch: false
      }));

      await waitFor(() => {
        result.current.fetchInsights();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const processedMember = result.current.data?.memberSpending[0];
      expect(processedMember?.full_name).toBe('Unknown Member');
      expect(processedMember?.role).toBe(undefined);
      expect(processedMember?.total_expenses).toBe(0);
      expect(processedMember?.total_income).toBe(0);
      expect(processedMember?.transaction_count).toBe(0);
      expect(processedMember?.avg_transaction_amount).toBe(50.5);
      expect(processedMember?.most_used_category).toBe('None');
      expect(processedMember?.spending_trend).toBe(0);
      expect(processedMember?.category_breakdown).toEqual({});
    });

    it('should handle malformed JSON in category_breakdown', async () => {
      const dataWithBadJson = [
        {
          user_id: 'user-1',
          full_name: 'Test User',
          role: 'admin',
          total_expenses: 1000,
          total_income: 2000,
          transaction_count: 10,
          avg_transaction_amount: 100,
          most_used_category: 'Food',
          spending_trend: 5,
          category_breakdown: 'invalid-json'
        }
      ];

      mockSupabase.rpc = vi.fn()
        .mockResolvedValueOnce({ data: dataWithBadJson, error: null })
        .mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useFamilyInsights({
        autoFetch: false
      }));

      await waitFor(() => {
        result.current.fetchInsights();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const processedMember = result.current.data?.memberSpending[0];
      expect(processedMember?.category_breakdown).toEqual({});
    });
  });

  describe('refresh functionality', () => {
    it('should refresh insights with loading toast', async () => {
      mockSupabase.rpc = vi.fn()
        .mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useFamilyInsights({
        autoFetch: false
      }));

      await waitFor(() => {
        result.current.refreshInsights();
      });

      expect(mockToast.loading).toHaveBeenCalledWith('Refreshing family insights...');
      expect(mockToast.success).toHaveBeenCalledWith('Family insights updated');
    });
  });

  describe('auto-fetch behavior', () => {
    it('should auto-fetch when autoFetch is true and family exists', async () => {
      mockSupabase.rpc = vi.fn()
        .mockResolvedValue({ data: [], error: null });

      renderHook(() => useFamilyInsights({
        autoFetch: true
      }));

      await waitFor(() => {
        expect(mockSupabase.rpc).toHaveBeenCalled();
      });
    });

    it('should not auto-fetch when no family is selected', async () => {
      const originalMockFamily = mockFamily.currentFamily;
      mockFamily.currentFamily = null;

      mockSupabase.rpc = vi.fn();

      renderHook(() => useFamilyInsights({
        autoFetch: true
      }));

      await waitFor(() => {
        expect(mockSupabase.rpc).not.toHaveBeenCalled();
      });

      // Restore original mock
      mockFamily.currentFamily = originalMockFamily;
    });
  });
});