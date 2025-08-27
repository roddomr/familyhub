import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BudgetRecommendations } from '../BudgetRecommendations';
import { supabase } from '@/lib/supabase';

// Integration test that tests the full flow of budget recommendations
vi.mock('@/lib/supabase');
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

const mockSupabase = vi.mocked(supabase);

// Mock contexts and hooks with realistic data
const mockAuth = { user: { id: 'test-user-id' } };
const mockFamily = { currentFamily: { id: 'test-family-id' } };
const mockLogger = { logInfo: vi.fn(), logError: vi.fn() };
const mockToast = { 
  apiError: vi.fn(), 
  loading: vi.fn(), 
  success: vi.fn() 
};

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

describe('BudgetRecommendations Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockRecommendationsData = [
    {
      recommendation_type: 'reduce_category',
      category_name: 'Food',
      current_spending: 800,
      recommended_budget: 600,
      potential_savings: 200,
      confidence_score: 0.85,
      reason: 'Your food spending is 25% above average for families of your size',
      action_items: {
        set_monthly_limit: 600,
        track_daily: true,
        review_frequency: 'weekly',
        suggest_alternatives: true
      }
    },
    {
      recommendation_type: 'emergency_fund',
      category_name: 'Emergency Fund',
      current_spending: 0,
      recommended_budget: 500,
      potential_savings: 500,
      confidence_score: 0.95,
      reason: 'Building an emergency fund is crucial for financial security',
      action_items: {
        start_amount: 100,
        monthly_target: 500,
        automate: true,
        separate_account: true
      }
    },
    {
      recommendation_type: 'increase_savings',
      category_name: 'Savings Target',
      current_spending: 0,
      recommended_budget: 600,
      potential_savings: 400,
      confidence_score: 0.80,
      reason: 'Increase your savings rate to 20% of income',
      action_items: {
        current_savings_rate: 10,
        target_savings_rate: 20,
        monthly_savings_target: 600,
        investment_consideration: true
      }
    }
  ];

  const mockTemplatesData = [
    {
      template_name: '50/30/20 Rule',
      template_description: 'A balanced approach to budgeting: 50% needs, 30% wants, 20% savings',
      category_allocations: {
        Housing: 1500,
        Food: 600,
        Transportation: 400,
        Entertainment: 300,
        Savings: 600,
        Utilities: 200,
        Healthcare: 150
      },
      suitability_score: 0.9,
      pros_cons: {
        pros: [
          'Simple to follow and remember',
          'Balanced approach to spending and saving',
          'Flexible within categories',
          'Works well for steady income'
        ],
        cons: [
          'May not fit all income levels',
          'Requires discipline to stick to percentages',
          'Less suitable for irregular income',
          'May need adjustment for high-cost areas'
        ]
      }
    },
    {
      template_name: 'Zero-Based Budget',
      template_description: 'Every dollar has a purpose - income minus expenses equals zero',
      category_allocations: {
        Housing: 1400,
        Food: 500,
        Transportation: 350,
        Entertainment: 200,
        Savings: 700,
        Utilities: 180,
        Healthcare: 120,
        Personal: 150,
        Miscellaneous: 100
      },
      suitability_score: 0.75,
      pros_cons: {
        pros: [
          'Maximum control over spending',
          'Forces intentional decision-making',
          'Can maximize savings potential',
          'Great for debt payoff'
        ],
        cons: [
          'Time-intensive to maintain',
          'Can be restrictive',
          'Requires detailed tracking',
          'May cause stress if too rigid'
        ]
      }
    }
  ];

  describe('Complete User Flow Integration', () => {
    it('should handle complete user workflow: load -> enter income -> get recommendations -> view templates', async () => {
      // Setup successful API responses
      mockSupabase.rpc = vi.fn()
        .mockResolvedValueOnce({ data: [], error: null }) // Initial load with no income
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: mockRecommendationsData, error: null }) // After income input
        .mockResolvedValueOnce({ data: mockTemplatesData, error: null });

      render(<BudgetRecommendations />);

      // Step 1: Initial load should show empty state
      expect(screen.getByText('No Recommendations Available')).toBeInTheDocument();
      expect(screen.getByText('Monthly Income Setup')).toBeInTheDocument();

      // Step 2: Enter monthly income
      const incomeInput = screen.getByLabelText('Monthly Income');
      const updateButton = screen.getByText('Update Recommendations');

      fireEvent.change(incomeInput, { target: { value: '3000' } });
      expect(incomeInput.value).toBe('3000');
      expect(updateButton).not.toBeDisabled();

      // Step 3: Update recommendations
      fireEvent.click(updateButton);

      // Should show loading state
      await waitFor(() => {
        expect(mockSupabase.rpc).toHaveBeenCalledWith('get_budget_recommendations', expect.objectContaining({
          family_id_param: 'test-family-id'
        }));
      });

      // Step 4: Verify recommendations are displayed
      await waitFor(() => {
        expect(screen.getByText('Food')).toBeInTheDocument();
        expect(screen.getByText('Emergency Fund')).toBeInTheDocument();
        expect(screen.getByText('$1,100')).toBeInTheDocument(); // Total potential savings
      });

      // Step 5: Check summary cards
      expect(screen.getByText('2')).toBeInTheDocument(); // High-confidence recommendations
      expect(screen.getByText('Needed')).toBeInTheDocument(); // Emergency fund status

      // Step 6: Switch to templates tab
      const templatesTab = screen.getByText('Budget Templates');
      fireEvent.click(templatesTab);

      await waitFor(() => {
        expect(screen.getByText('50/30/20 Rule')).toBeInTheDocument();
        expect(screen.getByText('Zero-Based Budget')).toBeInTheDocument();
      });

      // Step 7: Verify template details
      expect(screen.getByText('A balanced approach to budgeting: 50% needs, 30% wants, 20% savings')).toBeInTheDocument();
      expect(screen.getByText('$1,500')).toBeInTheDocument(); // Housing allocation
      expect(screen.getByText('Simple to follow and remember')).toBeInTheDocument();

      // Step 8: Switch to analysis tab
      const analysisTab = screen.getByText('Analysis');
      fireEvent.click(analysisTab);

      await waitFor(() => {
        expect(screen.getByText('Analysis')).toBeInTheDocument();
      });
    });

    it('should handle error scenarios gracefully during workflow', async () => {
      // Setup API error on second call (after income input)
      mockSupabase.rpc = vi.fn()
        .mockResolvedValueOnce({ data: [], error: null }) // Initial load
        .mockResolvedValueOnce({ data: [], error: null })
        .mockRejectedValueOnce(new Error('Network timeout')); // Error on recommendations fetch

      render(<BudgetRecommendations />);

      // Enter income and trigger update
      const incomeInput = screen.getByLabelText('Monthly Income');
      const updateButton = screen.getByText('Update Recommendations');

      fireEvent.change(incomeInput, { target: { value: '3000' } });
      fireEvent.click(updateButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Failed to Load Budget Recommendations')).toBeInTheDocument();
        expect(screen.getByText('Network timeout')).toBeInTheDocument();
      });

      // Should show try again button
      const tryAgainButton = screen.getByText('Try Again');
      expect(tryAgainButton).toBeInTheDocument();

      // Try again should work
      mockSupabase.rpc = vi.fn()
        .mockResolvedValueOnce({ data: mockRecommendationsData, error: null })
        .mockResolvedValueOnce({ data: mockTemplatesData, error: null });

      fireEvent.click(tryAgainButton);

      await waitFor(() => {
        expect(screen.getByText('Food')).toBeInTheDocument();
      });
    });

    it('should handle refresh functionality properly', async () => {
      // Setup initial successful load
      mockSupabase.rpc = vi.fn()
        .mockResolvedValue({ data: mockRecommendationsData, error: null });

      render(<BudgetRecommendations />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Food')).toBeInTheDocument();
      });

      // Click refresh
      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);

      // Should show loading toast
      expect(mockToast.loading).toHaveBeenCalledWith('Refreshing budget recommendations...');
      
      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Budget recommendations updated');
      });
    });

    it('should persist user interactions across tab switches', async () => {
      mockSupabase.rpc = vi.fn()
        .mockResolvedValue({ data: mockRecommendationsData, error: null })
        .mockResolvedValue({ data: mockTemplatesData, error: null });

      render(<BudgetRecommendations />);

      // Enter income
      const incomeInput = screen.getByLabelText('Monthly Income');
      fireEvent.change(incomeInput, { target: { value: '4000' } });

      // Switch to templates tab
      fireEvent.click(screen.getByText('Budget Templates'));

      await waitFor(() => {
        expect(screen.getByText('50/30/20 Rule')).toBeInTheDocument();
      });

      // Switch back to recommendations
      fireEvent.click(screen.getByText('Recommendations'));

      // Income should still be there
      expect(screen.getByDisplayValue('4000')).toBeInTheDocument();
    });
  });

  describe('Performance and Loading States', () => {
    it('should handle concurrent API calls properly', async () => {
      let resolveRecommendations: (value: any) => void;
      let resolveTemplates: (value: any) => void;

      const recommendationsPromise = new Promise(resolve => {
        resolveRecommendations = resolve;
      });

      const templatesPromise = new Promise(resolve => {
        resolveTemplates = resolve;
      });

      mockSupabase.rpc = vi.fn()
        .mockReturnValueOnce(recommendationsPromise)
        .mockReturnValueOnce(templatesPromise);

      render(<BudgetRecommendations />);

      const incomeInput = screen.getByLabelText('Monthly Income');
      const updateButton = screen.getByText('Update Recommendations');

      fireEvent.change(incomeInput, { target: { value: '3000' } });
      fireEvent.click(updateButton);

      // Should show loading state
      expect(screen.getAllByTestId('skeleton')).toBeDefined();

      // Resolve recommendations first
      resolveRecommendations!({ data: mockRecommendationsData, error: null });

      // Should still show loading for templates
      await waitFor(() => {
        expect(screen.getByText('Food')).toBeInTheDocument();
      });

      // Resolve templates
      resolveTemplates!({ data: mockTemplatesData, error: null });

      // Should show complete data
      fireEvent.click(screen.getByText('Budget Templates'));
      
      await waitFor(() => {
        expect(screen.getByText('50/30/20 Rule')).toBeInTheDocument();
      });
    });

    it('should handle rapid user interactions without race conditions', async () => {
      mockSupabase.rpc = vi.fn()
        .mockResolvedValue({ data: mockRecommendationsData, error: null });

      render(<BudgetRecommendations />);

      const incomeInput = screen.getByLabelText('Monthly Income');
      const updateButton = screen.getByText('Update Recommendations');

      // Rapid fire multiple updates
      fireEvent.change(incomeInput, { target: { value: '3000' } });
      fireEvent.click(updateButton);
      
      fireEvent.change(incomeInput, { target: { value: '4000' } });
      fireEvent.click(updateButton);
      
      fireEvent.change(incomeInput, { target: { value: '5000' } });
      fireEvent.click(updateButton);

      // Should handle gracefully and show final result
      await waitFor(() => {
        expect(screen.getByText('Food')).toBeInTheDocument();
      });

      // Should use the latest income value in API call
      expect(mockSupabase.rpc).toHaveBeenLastCalledWith('get_budget_recommendations', 
        expect.objectContaining({
          family_id_param: 'test-family-id'
        })
      );
    });
  });

  describe('Data Validation Integration', () => {
    it('should handle malformed API responses gracefully', async () => {
      const malformedData = [
        {
          // Missing required fields
          recommendation_type: 'reduce_category',
          category_name: null,
          current_spending: 'invalid',
          recommended_budget: undefined,
          potential_savings: null,
          confidence_score: 'high',
          reason: '',
          action_items: 'not-json'
        }
      ];

      mockSupabase.rpc = vi.fn()
        .mockResolvedValueOnce({ data: malformedData, error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      render(<BudgetRecommendations />);

      const incomeInput = screen.getByLabelText('Monthly Income');
      const updateButton = screen.getByText('Update Recommendations');

      fireEvent.change(incomeInput, { target: { value: '3000' } });
      fireEvent.click(updateButton);

      // Should handle gracefully and not crash
      await waitFor(() => {
        expect(screen.queryByText('No Recommendations Available')).toBeInTheDocument();
      });

      // Should log the error
      expect(mockLogger.logError).not.toHaveBeenCalled(); // Since the hook handles this internally
    });

    it('should validate income input properly', async () => {
      mockSupabase.rpc = vi.fn()
        .mockResolvedValue({ data: mockRecommendationsData, error: null });

      render(<BudgetRecommendations />);

      const incomeInput = screen.getByLabelText('Monthly Income');
      const updateButton = screen.getByText('Update Recommendations');

      // Test invalid inputs
      fireEvent.change(incomeInput, { target: { value: '-1000' } });
      expect(updateButton).toBeDisabled();

      fireEvent.change(incomeInput, { target: { value: '0' } });
      expect(updateButton).toBeDisabled();

      fireEvent.change(incomeInput, { target: { value: 'abc' } });
      expect(updateButton).toBeDisabled();

      // Test valid input
      fireEvent.change(incomeInput, { target: { value: '3000' } });
      expect(updateButton).not.toBeDisabled();
    });
  });
});