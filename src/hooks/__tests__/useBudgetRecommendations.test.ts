import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useBudgetRecommendations } from '../useBudgetRecommendations';
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

describe('useBudgetRecommendations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchRecommendations', () => {
    it('should fetch budget recommendations successfully', async () => {
      const mockRecommendations = [
        {
          recommendation_type: 'reduce_category',
          category_name: 'Food',
          current_spending: 500,
          recommended_budget: 400,
          potential_savings: 100,
          confidence_score: 0.85,
          reason: 'High spending category',
          action_items: { set_monthly_limit: 400 }
        },
        {
          recommendation_type: 'emergency_fund',
          category_name: 'Emergency Fund',
          current_spending: 0,
          recommended_budget: 300,
          potential_savings: 300,
          confidence_score: 0.95,
          reason: 'Build emergency fund',
          action_items: { start_amount: 100 }
        }
      ];

      const mockTemplates = [
        {
          template_name: '50/30/20 Rule',
          template_description: 'Balanced approach',
          category_allocations: { Housing: 1500, Food: 600, Savings: 600 },
          suitability_score: 0.9,
          pros_cons: { pros: ['Simple'], cons: ['Rigid'] }
        }
      ];

      mockSupabase.rpc = vi.fn()
        .mockResolvedValueOnce({ data: mockRecommendations, error: null })
        .mockResolvedValueOnce({ data: mockTemplates, error: null });

      const { result } = renderHook(() => useBudgetRecommendations({
        monthlyIncome: 3000,
        autoFetch: false
      }));

      await waitFor(() => {
        result.current.fetchRecommendations({ monthlyIncome: 3000 });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual({
        recommendations: mockRecommendations.map(rec => ({
          ...rec,
          current_spending: 500,
          recommended_budget: rec.recommendation_type === 'reduce_category' ? 400 : 300,
          potential_savings: rec.recommendation_type === 'reduce_category' ? 100 : 300,
          confidence_score: rec.recommendation_type === 'reduce_category' ? 0.85 : 0.95
        })),
        templates: mockTemplates.map(template => ({
          ...template,
          suitability_score: 0.9
        })),
        totalPotentialSavings: 400,
        highConfidenceRecommendations: expect.any(Array),
        emergencyFundStatus: {
          hasRecommendation: true,
          targetAmount: 300,
          currentProgress: 0
        }
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_budget_recommendations', {
        family_id_param: 'test-family-id',
        start_date_param: expect.any(String),
        end_date_param: expect.any(String)
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_budget_templates', {
        family_id_param: 'test-family-id',
        monthly_income_param: 3000
      });
    });

    it('should handle API errors gracefully', async () => {
      const mockError = new Error('Database connection failed');
      mockSupabase.rpc = vi.fn().mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useBudgetRecommendations({
        autoFetch: false
      }));

      await waitFor(() => {
        result.current.fetchRecommendations();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Database connection failed');
      expect(mockToast.apiError).toHaveBeenCalledWith(mockError, 'fetching budget recommendations');
      expect(mockLogger.logError).toHaveBeenCalledWith(
        'Failed to fetch budget recommendations',
        mockError,
        expect.any(Object),
        'analytics',
        'budget-recommendations'
      );
    });

    it('should filter high confidence recommendations correctly', async () => {
      const mockRecommendations = [
        {
          recommendation_type: 'reduce_category',
          category_name: 'Food',
          current_spending: 500,
          recommended_budget: 400,
          potential_savings: 100,
          confidence_score: 0.85,
          reason: 'High confidence',
          action_items: {}
        },
        {
          recommendation_type: 'emergency_fund',
          category_name: 'Emergency Fund',
          current_spending: 0,
          recommended_budget: 300,
          potential_savings: 300,
          confidence_score: 0.75,
          reason: 'Medium confidence',
          action_items: {}
        }
      ];

      mockSupabase.rpc = vi.fn()
        .mockResolvedValueOnce({ data: mockRecommendations, error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      const { result } = renderHook(() => useBudgetRecommendations({
        autoFetch: false
      }));

      await waitFor(() => {
        result.current.fetchRecommendations();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data?.highConfidenceRecommendations).toHaveLength(1);
      expect(result.current.data?.highConfidenceRecommendations[0].confidence_score).toBe(0.85);
    });
  });

  describe('getBudgetPerformance', () => {
    it('should fetch budget performance data successfully', async () => {
      const mockPerformanceData = [
        {
          category_name: 'Food',
          budgeted_amount: 400,
          actual_spent: 450,
          variance: 50,
          variance_percentage: 12.5,
          performance_status: 'Slightly Over',
          recommendation: 'Monitor spending'
        }
      ];

      mockSupabase.rpc = vi.fn().mockResolvedValueOnce({ 
        data: mockPerformanceData, 
        error: null 
      });

      const { result } = renderHook(() => useBudgetRecommendations({
        autoFetch: false
      }));

      const budgetData = { Food: 400, Transport: 200 };
      const performance = await result.current.getBudgetPerformance(budgetData);

      expect(performance).toEqual([
        {
          category_name: 'Food',
          budgeted_amount: 400,
          actual_spent: 450,
          variance: 50,
          variance_percentage: 12.5,
          performance_status: 'Slightly Over',
          recommendation: 'Monitor spending'
        }
      ]);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_budget_performance', {
        family_id_param: 'test-family-id',
        budget_data: budgetData,
        start_date_param: expect.any(String),
        end_date_param: expect.any(String)
      });
    });

    it('should return empty array on performance API error', async () => {
      const mockError = new Error('Performance API failed');
      mockSupabase.rpc = vi.fn().mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useBudgetRecommendations({
        autoFetch: false
      }));

      const budgetData = { Food: 400 };
      const performance = await result.current.getBudgetPerformance(budgetData);

      expect(performance).toEqual([]);
      expect(mockToast.apiError).toHaveBeenCalledWith(mockError, 'analyzing budget performance');
    });
  });

  describe('refreshRecommendations', () => {
    it('should refresh recommendations with loading toast', async () => {
      mockSupabase.rpc = vi.fn()
        .mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useBudgetRecommendations({
        autoFetch: false
      }));

      await waitFor(() => {
        result.current.refreshRecommendations();
      });

      expect(mockToast.loading).toHaveBeenCalledWith('Refreshing budget recommendations...');
      expect(mockToast.success).toHaveBeenCalledWith('Budget recommendations updated');
    });
  });

  describe('auto-fetch behavior', () => {
    it('should auto-fetch when autoFetch is true', async () => {
      mockSupabase.rpc = vi.fn()
        .mockResolvedValue({ data: [], error: null });

      renderHook(() => useBudgetRecommendations({
        autoFetch: true
      }));

      await waitFor(() => {
        expect(mockSupabase.rpc).toHaveBeenCalledWith('get_budget_recommendations', expect.any(Object));
      });
    });

    it('should not auto-fetch when autoFetch is false', async () => {
      mockSupabase.rpc = vi.fn();

      renderHook(() => useBudgetRecommendations({
        autoFetch: false
      }));

      await waitFor(() => {
        expect(mockSupabase.rpc).not.toHaveBeenCalled();
      });
    });
  });

  describe('data processing', () => {
    it('should correctly calculate total potential savings', async () => {
      const mockRecommendations = [
        {
          recommendation_type: 'reduce_category',
          category_name: 'Food',
          current_spending: 500,
          recommended_budget: 400,
          potential_savings: 100,
          confidence_score: 0.85,
          reason: 'Test',
          action_items: {}
        },
        {
          recommendation_type: 'emergency_fund',
          category_name: 'Emergency Fund',
          current_spending: 0,
          recommended_budget: 300,
          potential_savings: 300,
          confidence_score: 0.95,
          reason: 'Test',
          action_items: {}
        }
      ];

      mockSupabase.rpc = vi.fn()
        .mockResolvedValueOnce({ data: mockRecommendations, error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      const { result } = renderHook(() => useBudgetRecommendations({
        autoFetch: false
      }));

      await waitFor(() => {
        result.current.fetchRecommendations();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data?.totalPotentialSavings).toBe(400);
    });

    it('should handle missing optional fields gracefully', async () => {
      const mockRecommendations = [
        {
          recommendation_type: 'reduce_category',
          category_name: 'Food',
          current_spending: null,
          recommended_budget: undefined,
          potential_savings: '150.5',
          confidence_score: '0.8',
          reason: null,
          action_items: null
        }
      ];

      mockSupabase.rpc = vi.fn()
        .mockResolvedValueOnce({ data: mockRecommendations, error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      const { result } = renderHook(() => useBudgetRecommendations({
        autoFetch: false
      }));

      await waitFor(() => {
        result.current.fetchRecommendations();
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const processedRec = result.current.data?.recommendations[0];
      expect(processedRec?.current_spending).toBe(0);
      expect(processedRec?.recommended_budget).toBe(0);
      expect(processedRec?.potential_savings).toBe(150.5);
      expect(processedRec?.confidence_score).toBe(0.8);
      expect(processedRec?.reason).toBe('');
      expect(processedRec?.action_items).toEqual({});
    });
  });
});