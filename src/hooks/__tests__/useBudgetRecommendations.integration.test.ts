import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useBudgetRecommendations } from '../useBudgetRecommendations';
import { supabase } from '@/lib/supabase';

// Integration test for budget recommendations that tests real-world scenarios
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

describe('useBudgetRecommendations Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Realistic production-like data
  const mockRealWorldRecommendations = [
    {
      recommendation_type: 'reduce_category',
      category_name: 'Dining Out',
      current_spending: 650,
      recommended_budget: 400,
      potential_savings: 250,
      confidence_score: 0.88,
      reason: 'Your dining expenses are 30% higher than similar families. Consider meal planning and cooking at home more often.',
      action_items: {
        set_monthly_limit: 400,
        track_daily: true,
        review_frequency: 'weekly',
        suggest_alternatives: true,
        meal_planning_tips: [
          'Plan weekly menus in advance',
          'Batch cook on weekends',
          'Use grocery pickup to avoid impulse purchases'
        ]
      }
    },
    {
      recommendation_type: 'reduce_category',
      category_name: 'Entertainment',
      current_spending: 480,
      recommended_budget: 350,
      potential_savings: 130,
      confidence_score: 0.75,
      reason: 'Entertainment spending has increased by 25% over the past 3 months. Look for free or low-cost alternatives.',
      action_items: {
        set_monthly_limit: 350,
        track_daily: false,
        review_frequency: 'monthly',
        suggest_alternatives: true,
        free_alternatives: [
          'Public library events',
          'Free museum days',
          'Community center activities',
          'Hiking and outdoor activities'
        ]
      }
    },
    {
      recommendation_type: 'emergency_fund',
      category_name: 'Emergency Fund',
      current_spending: 0,
      recommended_budget: 600,
      potential_savings: 600,
      confidence_score: 0.95,
      reason: 'You currently have no emergency fund. Financial experts recommend 3-6 months of expenses saved for emergencies.',
      action_items: {
        start_amount: 150,
        monthly_target: 600,
        automate: true,
        separate_account: true,
        target_months: 6,
        priority_level: 'high',
        automation_tips: [
          'Set up automatic transfer on payday',
          'Use a high-yield savings account',
          'Start small and increase gradually'
        ]
      }
    },
    {
      recommendation_type: 'increase_savings',
      category_name: 'Retirement Savings',
      current_spending: 0,
      recommended_budget: 800,
      potential_savings: 800,
      confidence_score: 0.85,
      reason: 'Increase retirement contributions to take advantage of compound growth and potential employer matching.',
      action_items: {
        current_savings_rate: 8,
        target_savings_rate: 15,
        monthly_savings_target: 800,
        investment_consideration: true,
        employer_match: true,
        tax_advantages: [
          'Traditional 401(k) reduces current taxes',
          'Roth IRA provides tax-free growth',
          'HSA triple tax advantage if available'
        ]
      }
    }
  ];

  const mockRealWorldTemplates = [
    {
      template_name: '50/30/20 Rule',
      template_description: 'Allocate 50% to needs, 30% to wants, and 20% to savings and debt repayment',
      category_allocations: {
        Housing: 1800,
        Food: 600,
        Transportation: 500,
        Insurance: 300,
        Utilities: 200,
        Healthcare: 150,
        Entertainment: 400,
        Personal: 300,
        Miscellaneous: 250,
        'Emergency Fund': 400,
        'Retirement Savings': 500,
        'Debt Payment': 200
      },
      suitability_score: 0.92,
      pros_cons: {
        pros: [
          'Simple and easy to remember',
          'Balanced approach to spending and saving',
          'Flexible within categories',
          'Good starting point for beginners',
          'Emphasizes saving and debt reduction'
        ],
        cons: [
          'May not work in high-cost living areas',
          'Fixed percentages may not fit all situations',
          'Requires discipline to maintain',
          'May need adjustment for irregular income'
        ]
      }
    },
    {
      template_name: 'Zero-Based Budget',
      template_description: 'Assign every dollar a specific purpose - income minus expenses equals zero',
      category_allocations: {
        Housing: 1750,
        Food: 550,
        Transportation: 450,
        Insurance: 280,
        Utilities: 180,
        Healthcare: 120,
        Entertainment: 300,
        Personal: 250,
        'Emergency Fund': 500,
        'Retirement Savings': 600,
        'Debt Payment': 300,
        'Sinking Funds': 320
      },
      suitability_score: 0.78,
      pros_cons: {
        pros: [
          'Maximum control over every dollar',
          'Forces intentional spending decisions',
          'Great for debt payoff',
          'Can optimize savings potential',
          'Helps identify spending leaks'
        ],
        cons: [
          'Time-intensive to maintain',
          'Can be overwhelming for beginners',
          'Less flexible for unexpected expenses',
          'Requires detailed tracking',
          'May cause budget fatigue'
        ]
      }
    },
    {
      template_name: 'Pay Yourself First',
      template_description: 'Prioritize savings and investments before any other spending',
      category_allocations: {
        'Emergency Fund': 600,
        'Retirement Savings': 750,
        'Investment Fund': 300,
        Housing: 1600,
        Food: 500,
        Transportation: 400,
        Insurance: 250,
        Utilities: 170,
        Healthcare: 100,
        Entertainment: 250,
        Personal: 180,
        Miscellaneous: 100
      },
      suitability_score: 0.85,
      pros_cons: {
        pros: [
          'Ensures savings happen first',
          'Builds wealth over time',
          'Simple to implement',
          'Reduces lifestyle inflation',
          'Creates financial security'
        ],
        cons: [
          'May leave little for discretionary spending',
          'Requires lower living expenses',
          'Can be challenging with tight budgets',
          'May need emergency fund access'
        ]
      }
    }
  ];

  const mockPerformanceData = [
    {
      category_name: 'Food',
      budgeted_amount: 600,
      actual_spent: 720,
      variance: 120,
      variance_percentage: 20.0,
      performance_status: 'Over Budget',
      recommendation: 'Track daily food expenses and consider meal planning to reduce overspending'
    },
    {
      category_name: 'Transportation',
      budgeted_amount: 500,
      actual_spent: 480,
      variance: -20,
      variance_percentage: -4.0,
      performance_status: 'Under Budget',
      recommendation: 'Good job staying under budget! Consider allocating savings to emergency fund'
    },
    {
      category_name: 'Entertainment',
      budgeted_amount: 400,
      actual_spent: 520,
      variance: 120,
      variance_percentage: 30.0,
      performance_status: 'Significantly Over',
      recommendation: 'Entertainment spending is significantly over budget. Review recent expenses and set daily limits'
    }
  ];

  describe('Complete Budget Workflow Integration', () => {
    it('should handle full production workflow: recommendations -> templates -> performance analysis', async () => {
      // Setup successful API responses for complete workflow
      mockSupabase.rpc = vi.fn()
        .mockResolvedValueOnce({ data: mockRealWorldRecommendations, error: null })
        .mockResolvedValueOnce({ data: mockRealWorldTemplates, error: null })
        .mockResolvedValueOnce({ data: mockPerformanceData, error: null });

      const { result } = renderHook(() => useBudgetRecommendations({
        monthlyIncome: 5000,
        dateRange: {
          start: '2024-07-01',
          end: '2024-07-31'
        },
        autoFetch: false
      }));

      // Step 1: Fetch recommendations
      await waitFor(() => {
        result.current.fetchRecommendations({ monthlyIncome: 5000 });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify recommendations data structure
      expect(result.current.data).toEqual({
        recommendations: mockRealWorldRecommendations,
        templates: mockRealWorldTemplates,
        totalPotentialSavings: 1780, // 250 + 130 + 600 + 800
        highConfidenceRecommendations: expect.arrayContaining([
          expect.objectContaining({
            confidence_score: 0.95,
            recommendation_type: 'emergency_fund'
          }),
          expect.objectContaining({
            confidence_score: 0.88,
            recommendation_type: 'reduce_category'
          })
        ]),
        emergencyFundStatus: {
          hasRecommendation: true,
          targetAmount: 600,
          currentProgress: 0
        }
      });

      // Step 2: Test budget performance analysis
      const budgetData = {
        Food: 600,
        Transportation: 500,
        Entertainment: 400
      };

      const performance = await result.current.getBudgetPerformance(budgetData);

      expect(performance).toEqual(mockPerformanceData);

      // Verify all API calls were made correctly
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_budget_recommendations', {
        family_id_param: 'test-family-id',
        start_date_param: expect.any(String),
        end_date_param: expect.any(String)
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_budget_templates', {
        family_id_param: 'test-family-id',
        monthly_income_param: 5000
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_budget_performance', {
        family_id_param: 'test-family-id',
        budget_data: budgetData,
        start_date_param: expect.any(String),
        end_date_param: expect.any(String)
      });
    });

    it('should handle different income levels and scale recommendations appropriately', async () => {
      const scenarios = [
        { income: 2000, expectedEmergencyTarget: 200 }, // Low income
        { income: 5000, expectedEmergencyTarget: 500 }, // Medium income
        { income: 10000, expectedEmergencyTarget: 1000 } // High income
      ];

      for (const scenario of scenarios) {
        const scaledRecommendations = mockRealWorldRecommendations.map(rec => ({
          ...rec,
          recommended_budget: rec.recommendation_type === 'emergency_fund' 
            ? scenario.expectedEmergencyTarget 
            : rec.recommended_budget,
          potential_savings: rec.recommendation_type === 'emergency_fund' 
            ? scenario.expectedEmergencyTarget 
            : rec.potential_savings
        }));

        const scaledTemplates = mockRealWorldTemplates.map(template => ({
          ...template,
          category_allocations: Object.fromEntries(
            Object.entries(template.category_allocations).map(([category, amount]) => [
              category,
              Math.round((amount as number) * scenario.income / 5000) // Scale based on income
            ])
          )
        }));

        mockSupabase.rpc = vi.fn()
          .mockResolvedValueOnce({ data: scaledRecommendations, error: null })
          .mockResolvedValueOnce({ data: scaledTemplates, error: null });

        const { result } = renderHook(() => useBudgetRecommendations({
          monthlyIncome: scenario.income,
          autoFetch: false
        }));

        await waitFor(() => {
          result.current.fetchRecommendations({ monthlyIncome: scenario.income });
        });

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });

        // Emergency fund recommendation should scale with income
        const emergencyRec = result.current.data?.recommendations.find(
          rec => rec.recommendation_type === 'emergency_fund'
        );
        expect(emergencyRec?.recommended_budget).toBe(scenario.expectedEmergencyTarget);

        // Templates should scale appropriately
        expect(result.current.data?.templates[0].category_allocations.Housing).toBeCloseTo(
          1800 * scenario.income / 5000,
          0
        );
      }
    });

    it('should handle real-world API response variations and edge cases', async () => {
      // Simulate production API responses with missing fields, different data types
      const messyRecommendations = [
        {
          recommendation_type: 'reduce_category',
          category_name: 'Food',
          current_spending: '500.50', // String number
          recommended_budget: null, // Null value
          potential_savings: undefined, // Undefined
          confidence_score: 'high', // Invalid score type
          reason: '', // Empty string
          action_items: '{"limit": 400}' // JSON string instead of object
        },
        {
          recommendation_type: 'emergency_fund',
          // Missing category_name
          current_spending: 0,
          recommended_budget: 300,
          potential_savings: 300,
          confidence_score: 0.95,
          reason: 'Build emergency fund',
          action_items: null // Null action items
        }
      ];

      const messyTemplates = [
        {
          template_name: '50/30/20 Rule',
          template_description: null, // Null description
          category_allocations: '{"Housing": 1500}', // JSON string
          suitability_score: '0.9', // String score
          pros_cons: null // Null pros/cons
        }
      ];

      mockSupabase.rpc = vi.fn()
        .mockResolvedValueOnce({ data: messyRecommendations, error: null })
        .mockResolvedValueOnce({ data: messyTemplates, error: null });

      const { result } = renderHook(() => useBudgetRecommendations({
        autoFetch: false
      }));

      await waitFor(() => {
        result.current.fetchRecommendations();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should handle data cleaning and not crash
      expect(result.current.data).toBeTruthy();
      
      const processedRecs = result.current.data?.recommendations || [];
      expect(processedRecs).toHaveLength(2);

      // First recommendation should be cleaned
      expect(processedRecs[0]).toEqual(
        expect.objectContaining({
          current_spending: 500.5, // String converted to number
          recommended_budget: 0, // Null handled
          potential_savings: 0, // Undefined handled
          confidence_score: 0, // Invalid string handled
          reason: '', // Empty string preserved
          action_items: { limit: 400 } // JSON string parsed
        })
      );

      // Second recommendation should have defaults
      expect(processedRecs[1]).toEqual(
        expect.objectContaining({
          category_name: 'Emergency Fund', // Default provided
          action_items: {} // Null handled
        })
      );
    });

    it('should handle concurrent operations and race conditions', async () => {
      let resolveRecommendations: (value: any) => void;
      let resolveTemplates: (value: any) => void;
      let resolvePerformance: (value: any) => void;

      const promises = {
        recommendations: new Promise(resolve => { resolveRecommendations = resolve; }),
        templates: new Promise(resolve => { resolveTemplates = resolve; }),
        performance: new Promise(resolve => { resolvePerformance = resolve; })
      };

      mockSupabase.rpc = vi.fn()
        .mockReturnValueOnce(promises.recommendations)
        .mockReturnValueOnce(promises.templates)
        .mockReturnValueOnce(promises.performance);

      const { result } = renderHook(() => useBudgetRecommendations({
        autoFetch: false
      }));

      // Start recommendations fetch
      await waitFor(() => {
        result.current.fetchRecommendations();
      });

      expect(result.current.loading).toBe(true);

      // Start performance analysis while recommendations are loading
      const performancePromise = result.current.getBudgetPerformance({ Food: 500 });

      // Resolve in different order to test race conditions
      resolveTemplates!({ data: mockRealWorldTemplates, error: null });
      resolvePerformance!({ data: mockPerformanceData, error: null });
      resolveRecommendations!({ data: mockRealWorldRecommendations, error: null });

      // Wait for all to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const performanceResult = await performancePromise;

      // Both operations should complete successfully
      expect(result.current.data?.recommendations).toBeTruthy();
      expect(performanceResult).toEqual(mockPerformanceData);
    });

    it('should handle refresh scenarios in production environment', async () => {
      // Initial load
      mockSupabase.rpc = vi.fn()
        .mockResolvedValue({ data: mockRealWorldRecommendations, error: null })
        .mockResolvedValue({ data: mockRealWorldTemplates, error: null });

      const { result } = renderHook(() => useBudgetRecommendations({
        monthlyIncome: 4000,
        autoFetch: false
      }));

      await waitFor(() => {
        result.current.fetchRecommendations({ monthlyIncome: 4000 });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialSavings = result.current.data?.totalPotentialSavings;

      // Simulate updated data after user makes changes
      const updatedRecommendations = mockRealWorldRecommendations.map(rec => ({
        ...rec,
        potential_savings: rec.potential_savings * 0.8 // Reduced savings after optimization
      }));

      mockSupabase.rpc = vi.fn()
        .mockResolvedValue({ data: updatedRecommendations, error: null })
        .mockResolvedValue({ data: mockRealWorldTemplates, error: null });

      // Refresh
      await waitFor(() => {
        result.current.refreshRecommendations();
      });

      // Should show loading and success toasts
      expect(mockToast.loading).toHaveBeenCalledWith('Refreshing budget recommendations...');

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockToast.success).toHaveBeenCalledWith('Budget recommendations updated');

      // Data should be updated
      const newSavings = result.current.data?.totalPotentialSavings;
      expect(newSavings).toBeLessThan(initialSavings!);
    });
  });

  describe('Production Error Scenarios', () => {
    it('should handle network timeouts and retries', async () => {
      // First call times out
      mockSupabase.rpc = vi.fn()
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValueOnce({ data: mockRealWorldRecommendations, error: null })
        .mockResolvedValueOnce({ data: mockRealWorldTemplates, error: null });

      const { result } = renderHook(() => useBudgetRecommendations({
        autoFetch: false
      }));

      // Initial fetch fails
      await waitFor(() => {
        result.current.fetchRecommendations();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('ETIMEDOUT');

      // Retry succeeds
      await waitFor(() => {
        result.current.fetchRecommendations();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.data?.recommendations).toBeTruthy();
    });

    it('should handle database constraint violations gracefully', async () => {
      const dbError = new Error('Database constraint violation');
      (dbError as any).code = '23505'; // Unique constraint violation

      mockSupabase.rpc = vi.fn()
        .mockRejectedValueOnce(dbError);

      const { result } = renderHook(() => useBudgetRecommendations({
        autoFetch: false
      }));

      await waitFor(() => {
        result.current.fetchRecommendations();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Database constraint violation');
      expect(mockToast.apiError).toHaveBeenCalledWith(dbError, 'fetching budget recommendations');
    });

    it('should handle partial service degradation', async () => {
      // Recommendations succeed but templates fail
      mockSupabase.rpc = vi.fn()
        .mockResolvedValueOnce({ data: mockRealWorldRecommendations, error: null })
        .mockRejectedValueOnce(new Error('Template service unavailable'));

      const { result } = renderHook(() => useBudgetRecommendations({
        autoFetch: false
      }));

      await waitFor(() => {
        result.current.fetchRecommendations();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should fail gracefully - in this case, the hook fails if any call fails
      expect(result.current.error).toBe('Template service unavailable');
      
      // But performance analysis should still work independently
      mockSupabase.rpc = vi.fn()
        .mockResolvedValueOnce({ data: mockPerformanceData, error: null });

      const performance = await result.current.getBudgetPerformance({ Food: 500 });
      expect(performance).toEqual(mockPerformanceData);
    });
  });

  describe('Auto-fetch Integration', () => {
    it('should handle auto-fetch with different conditions', async () => {
      mockSupabase.rpc = vi.fn()
        .mockResolvedValue({ data: mockRealWorldRecommendations, error: null });

      // Auto-fetch enabled
      renderHook(() => useBudgetRecommendations({
        monthlyIncome: 3000,
        autoFetch: true
      }));

      await waitFor(() => {
        expect(mockSupabase.rpc).toHaveBeenCalledWith('get_budget_recommendations', 
          expect.objectContaining({
            family_id_param: 'test-family-id'
          })
        );
      });

      vi.clearAllMocks();

      // Auto-fetch disabled
      renderHook(() => useBudgetRecommendations({
        monthlyIncome: 3000,
        autoFetch: false
      }));

      await waitFor(() => {
        expect(mockSupabase.rpc).not.toHaveBeenCalled();
      });
    });

    it('should handle family changes during auto-fetch', async () => {
      mockSupabase.rpc = vi.fn()
        .mockResolvedValue({ data: mockRealWorldRecommendations, error: null });

      const originalFamily = mockFamily.currentFamily;
      mockFamily.currentFamily = null;

      const { rerender } = renderHook(() => useBudgetRecommendations({
        autoFetch: true
      }));

      // Should not fetch without family
      await waitFor(() => {
        expect(mockSupabase.rpc).not.toHaveBeenCalled();
      });

      // Set family and rerender
      mockFamily.currentFamily = { id: 'new-family-id' };
      rerender();

      // Should now fetch
      await waitFor(() => {
        expect(mockSupabase.rpc).toHaveBeenCalledWith('get_budget_recommendations',
          expect.objectContaining({
            family_id_param: 'new-family-id'
          })
        );
      });

      // Restore
      mockFamily.currentFamily = originalFamily;
    });
  });
});