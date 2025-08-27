import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useFamilyInsights } from '../useFamilyInsights';
import { supabase } from '@/lib/supabase';

// Integration test for family insights that tests real-world scenarios
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

describe('useFamilyInsights Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Realistic test data that represents actual family spending patterns
  const mockRealWorldData = {
    memberSpending: [
      {
        user_id: 'parent-1',
        full_name: 'Sarah Johnson',
        role: 'admin',
        total_expenses: 2400,
        total_income: 4500,
        transaction_count: 45,
        avg_transaction_amount: 53.33,
        most_used_category: 'Groceries',
        spending_trend: 8.5,
        category_breakdown: {
          Groceries: 800,
          Transportation: 450,
          Utilities: 350,
          Entertainment: 300,
          Healthcare: 250,
          Shopping: 200,
          Dining: 150
        }
      },
      {
        user_id: 'parent-2',
        full_name: 'Mike Johnson',
        role: 'parent',
        total_expenses: 1800,
        total_income: 3200,
        transaction_count: 32,
        avg_transaction_amount: 56.25,
        most_used_category: 'Transportation',
        spending_trend: -3.2,
        category_breakdown: {
          Transportation: 600,
          Dining: 400,
          Entertainment: 350,
          Shopping: 250,
          Personal: 150,
          Miscellaneous: 50
        }
      },
      {
        user_id: 'child-1',
        full_name: 'Emma Johnson',
        role: 'child',
        total_expenses: 300,
        total_income: 0,
        transaction_count: 12,
        avg_transaction_amount: 25.00,
        most_used_category: 'Entertainment',
        spending_trend: 15.0,
        category_breakdown: {
          Entertainment: 150,
          Food: 100,
          Personal: 50
        }
      }
    ],
    sharedVsIndividual: [
      {
        analysis_type: 'shared',
        total_amount: 2100,
        transaction_count: 28,
        avg_amount: 75.00,
        percentage_of_total: 45.7,
        top_categories: {
          Groceries: 800,
          Utilities: 350,
          Healthcare: 250,
          Transportation: 400,
          Dining: 300
        }
      },
      {
        analysis_type: 'individual',
        total_amount: 2400,
        transaction_count: 61,
        avg_amount: 39.34,
        percentage_of_total: 54.3,
        top_categories: {
          Entertainment: 800,
          Shopping: 650,
          Personal: 350,
          Miscellaneous: 300,
          Transportation: 200,
          Dining: 100
        }
      }
    ],
    spendingComparison: [
      {
        comparison_metric: 'total_expenses',
        member_name: 'Sarah Johnson',
        member_role: 'admin',
        value: 2400,
        rank_position: 1,
        percentage_of_family_total: 52.2
      },
      {
        comparison_metric: 'total_expenses',
        member_name: 'Mike Johnson',
        member_role: 'parent',
        value: 1800,
        rank_position: 2,
        percentage_of_family_total: 39.1
      },
      {
        comparison_metric: 'total_expenses',
        member_name: 'Emma Johnson',
        member_role: 'child',
        value: 300,
        rank_position: 3,
        percentage_of_family_total: 6.5
      }
    ],
    healthInsights: [
      {
        insight_type: 'savings_rate',
        insight_title: 'Strong Family Savings Rate',
        insight_description: 'Your family is saving 28% of total income - well above the recommended 20%',
        impact_level: 'positive',
        recommended_action: 'Consider increasing investments or building a larger emergency fund',
        supporting_data: { savings_rate_percent: 28, monthly_savings: 2160 }
      },
      {
        insight_type: 'spending_distribution',
        insight_title: 'Shared Expense Balance',
        insight_description: 'Good balance between shared (46%) and individual (54%) expenses',
        impact_level: 'neutral',
        recommended_action: 'Current spending distribution is healthy',
        supporting_data: { shared_percentage: 45.7, individual_percentage: 54.3 }
      },
      {
        insight_type: 'category_concern',
        insight_title: 'Entertainment Spending Above Average',
        insight_description: 'Entertainment spending is 18% of total expenses, above recommended 15%',
        impact_level: 'warning',
        recommended_action: 'Review entertainment budget and consider alternatives',
        supporting_data: { category: 'Entertainment', current_percentage: 18, recommended_percentage: 15 }
      }
    ]
  };

  describe('Complete Family Insights Flow', () => {
    it('should fetch and process complete family insights successfully', async () => {
      // Setup all RPC calls to return realistic data
      mockSupabase.rpc = vi.fn()
        .mockResolvedValueOnce({ data: mockRealWorldData.memberSpending, error: null })
        .mockResolvedValueOnce({ data: mockRealWorldData.sharedVsIndividual, error: null })
        .mockResolvedValueOnce({ data: mockRealWorldData.spendingComparison, error: null })
        .mockResolvedValueOnce({ data: mockRealWorldData.healthInsights, error: null });

      const { result } = renderHook(() => useFamilyInsights({
        dateRange: {
          start: '2024-07-01',
          end: '2024-07-31'
        },
        autoFetch: false
      }));

      // Trigger insights fetch
      await waitFor(() => {
        result.current.fetchInsights();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify all data is properly processed and structured
      expect(result.current.data).toEqual({
        memberSpending: mockRealWorldData.memberSpending,
        sharedVsIndividual: mockRealWorldData.sharedVsIndividual,
        spendingComparison: mockRealWorldData.spendingComparison,
        financialHealthInsights: mockRealWorldData.healthInsights,
        period: {
          start: '2024-07-01',
          end: '2024-07-31',
          label: 'July 2024'
        },
        familyTotals: {
          totalIncome: 7700, // 4500 + 3200 + 0
          totalExpenses: 4500, // 2400 + 1800 + 300
          memberCount: 3,
          transactionCount: 89, // 45 + 32 + 12
          netIncome: 3200, // 7700 - 4500
          avgMemberExpenses: 1500 // 4500 / 3
        }
      });

      // Verify all RPC calls were made with correct parameters
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(4);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_family_spending_patterns', {
        family_id_param: 'test-family-id',
        start_date_param: '2024-07-01',
        end_date_param: '2024-07-31'
      });
    });

    it('should handle real-world data anomalies and edge cases', async () => {
      // Data with common real-world issues: nulls, inconsistent formats, missing fields
      const messyRealWorldData = [
        {
          user_id: 'user-1',
          full_name: '', // Empty name
          role: 'admin',
          total_expenses: null, // Null expense
          total_income: '3500.00', // String instead of number
          transaction_count: 0, // No transactions
          avg_transaction_amount: null,
          most_used_category: undefined,
          spending_trend: 'N/A', // Invalid trend
          category_breakdown: '{"Food": 500, "Invalid": "abc"}' // Mixed valid/invalid JSON
        },
        {
          user_id: 'user-2',
          full_name: 'Valid User',
          role: null, // Missing role
          total_expenses: -100, // Negative expense (refund scenario)
          total_income: 2000,
          transaction_count: 25,
          avg_transaction_amount: 40,
          most_used_category: 'Transportation',
          spending_trend: 5.5,
          category_breakdown: null // Null category breakdown
        }
      ];

      mockSupabase.rpc = vi.fn()
        .mockResolvedValueOnce({ data: messyRealWorldData, error: null })
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

      // Should handle data cleaning gracefully
      const processedMembers = result.current.data?.memberSpending;
      expect(processedMembers).toHaveLength(2);

      // First member with issues should be cleaned
      expect(processedMembers?.[0]).toEqual(
        expect.objectContaining({
          full_name: 'Unknown Member', // Empty name handled
          total_expenses: 0, // Null handled
          total_income: 3500, // String converted to number
          avg_transaction_amount: 0, // Null handled
          most_used_category: 'None', // Undefined handled
          spending_trend: 0, // Invalid string handled
          category_breakdown: { Food: 500 } // Invalid JSON entries filtered
        })
      );

      // Second member should be processed normally despite negative expense
      expect(processedMembers?.[1]).toEqual(
        expect.objectContaining({
          full_name: 'Valid User',
          role: null, // Preserved as is
          total_expenses: -100, // Negative preserved (could be refunds)
          category_breakdown: {} // Null handled
        })
      );
    });

    it('should handle multiple date range scenarios correctly', async () => {
      const scenarios = [
        {
          range: { start: '2024-01-01', end: '2024-01-07' },
          expectedLabel: 'Last 7 Days'
        },
        {
          range: { start: '2024-01-01', end: '2024-01-31' },
          expectedLabel: 'January 2024'
        },
        {
          range: { start: '2024-01-01', end: '2024-12-31' },
          expectedLabel: '2024'
        },
        {
          range: { start: '2023-06-01', end: '2024-05-31' },
          expectedLabel: 'Jun 2023 - May 2024'
        }
      ];

      for (const scenario of scenarios) {
        mockSupabase.rpc = vi.fn()
          .mockResolvedValue({ data: [], error: null });

        const { result } = renderHook(() => useFamilyInsights({
          dateRange: scenario.range,
          autoFetch: false
        }));

        await waitFor(() => {
          result.current.fetchInsights(scenario.range);
        });

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        expect(result.current.data?.period.label).toBe(scenario.expectedLabel);
      }
    });

    it('should handle progressive data loading correctly', async () => {
      let resolveSpendingPatterns: (value: any) => void;
      let resolveSharedVsIndividual: (value: any) => void;
      let resolveSpendingComparison: (value: any) => void;
      let resolveHealthInsights: (value: any) => void;

      const promises = [
        new Promise(resolve => { resolveSpendingPatterns = resolve; }),
        new Promise(resolve => { resolveSharedVsIndividual = resolve; }),
        new Promise(resolve => { resolveSpendingComparison = resolve; }),
        new Promise(resolve => { resolveHealthInsights = resolve; })
      ];

      mockSupabase.rpc = vi.fn()
        .mockReturnValueOnce(promises[0])
        .mockReturnValueOnce(promises[1])
        .mockReturnValueOnce(promises[2])
        .mockReturnValueOnce(promises[3]);

      const { result } = renderHook(() => useFamilyInsights({
        autoFetch: false
      }));

      // Start fetching
      await waitFor(() => {
        result.current.fetchInsights();
      });

      // Should be loading initially
      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();

      // Resolve spending patterns first
      resolveSpendingPatterns!({ data: mockRealWorldData.memberSpending, error: null });

      // Should still be loading until all are resolved
      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      // Resolve remaining calls
      resolveSharedVsIndividual!({ data: mockRealWorldData.sharedVsIndividual, error: null });
      resolveSpendingComparison!({ data: mockRealWorldData.spendingComparison, error: null });
      resolveHealthInsights!({ data: mockRealWorldData.healthInsights, error: null });

      // Now should be complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeTruthy();
      expect(result.current.data?.memberSpending).toEqual(mockRealWorldData.memberSpending);
    });

    it('should handle partial API failures in production scenarios', async () => {
      // Simulate real scenario where some APIs fail but others succeed
      mockSupabase.rpc = vi.fn()
        .mockResolvedValueOnce({ data: mockRealWorldData.memberSpending, error: null }) // Success
        .mockRejectedValueOnce(new Error('Database timeout')) // Failure
        .mockResolvedValueOnce({ data: mockRealWorldData.spendingComparison, error: null }) // Success
        .mockRejectedValueOnce(new Error('Service unavailable')); // Failure

      const { result } = renderHook(() => useFamilyInsights({
        autoFetch: false
      }));

      await waitFor(() => {
        result.current.fetchInsights();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should fail gracefully and show first error encountered
      expect(result.current.error).toBe('Database timeout');
      expect(result.current.data).toBeNull();

      // Should log all errors appropriately
      expect(mockToast.apiError).toHaveBeenCalledWith(
        expect.any(Error),
        'fetching family insights'
      );
    });

    it('should refresh data correctly in production workflow', async () => {
      // Initial load
      mockSupabase.rpc = vi.fn()
        .mockResolvedValue({ data: mockRealWorldData.memberSpending, error: null });

      const { result } = renderHook(() => useFamilyInsights({
        autoFetch: false
      }));

      await waitFor(() => {
        result.current.fetchInsights();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialData = result.current.data;

      // Refresh with updated data
      const updatedMemberSpending = [
        ...mockRealWorldData.memberSpending,
        {
          user_id: 'new-member',
          full_name: 'New Family Member',
          role: 'child',
          total_expenses: 150,
          total_income: 0,
          transaction_count: 8,
          avg_transaction_amount: 18.75,
          most_used_category: 'Entertainment',
          spending_trend: 25.0,
          category_breakdown: { Entertainment: 100, Personal: 50 }
        }
      ];

      mockSupabase.rpc = vi.fn()
        .mockResolvedValue({ data: updatedMemberSpending, error: null });

      await waitFor(() => {
        result.current.refreshInsights();
      });

      // Should show loading toast
      expect(mockToast.loading).toHaveBeenCalledWith('Refreshing family insights...');

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Data should be updated
      expect(result.current.data?.memberSpending).toHaveLength(4);
      expect(result.current.data?.familyTotals.memberCount).toBe(4);
      
      // Should show success toast
      expect(mockToast.success).toHaveBeenCalledWith('Family insights updated');
    });
  });

  describe('Performance Integration Tests', () => {
    it('should handle large datasets efficiently', async () => {
      // Create large dataset similar to what might be seen in production
      const largeMemberSpending = Array.from({ length: 10 }, (_, i) => ({
        user_id: `user-${i}`,
        full_name: `Family Member ${i}`,
        role: i === 0 ? 'admin' : i < 5 ? 'parent' : 'child',
        total_expenses: Math.floor(Math.random() * 3000) + 500,
        total_income: i < 5 ? Math.floor(Math.random() * 5000) + 2000 : 0,
        transaction_count: Math.floor(Math.random() * 50) + 10,
        avg_transaction_amount: Math.floor(Math.random() * 100) + 20,
        most_used_category: ['Food', 'Transportation', 'Entertainment', 'Shopping'][Math.floor(Math.random() * 4)],
        spending_trend: (Math.random() - 0.5) * 20,
        category_breakdown: {
          Food: Math.floor(Math.random() * 500),
          Transportation: Math.floor(Math.random() * 400),
          Entertainment: Math.floor(Math.random() * 300)
        }
      }));

      mockSupabase.rpc = vi.fn()
        .mockResolvedValue({ data: largeMemberSpending, error: null });

      const startTime = Date.now();
      
      const { result } = renderHook(() => useFamilyInsights({
        autoFetch: false
      }));

      await waitFor(() => {
        result.current.fetchInsights();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should handle large dataset in reasonable time (< 1 second)
      expect(processingTime).toBeLessThan(1000);
      
      // Data should be properly processed
      expect(result.current.data?.memberSpending).toHaveLength(10);
      expect(result.current.data?.familyTotals.memberCount).toBe(10);
      
      // Totals should be calculated correctly
      const expectedTotalExpenses = largeMemberSpending.reduce((sum, member) => sum + member.total_expenses, 0);
      expect(result.current.data?.familyTotals.totalExpenses).toBe(expectedTotalExpenses);
    });
  });

  describe('Auto-fetch Integration', () => {
    it('should handle auto-fetch with family changes', async () => {
      mockSupabase.rpc = vi.fn()
        .mockResolvedValue({ data: [], error: null });

      // Start with no family
      const originalFamily = mockFamily.currentFamily;
      mockFamily.currentFamily = null;

      const { result, rerender } = renderHook(() => useFamilyInsights({
        autoFetch: true
      }));

      // Should not fetch initially
      await waitFor(() => {
        expect(mockSupabase.rpc).not.toHaveBeenCalled();
      });

      // Set family and rerender
      mockFamily.currentFamily = { id: 'new-family-id' };
      rerender();

      // Should now auto-fetch
      await waitFor(() => {
        expect(mockSupabase.rpc).toHaveBeenCalledWith('get_family_spending_patterns', 
          expect.objectContaining({
            family_id_param: 'new-family-id'
          })
        );
      });

      // Restore original mock
      mockFamily.currentFamily = originalFamily;
    });
  });
});