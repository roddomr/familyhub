import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BudgetRecommendations } from '../BudgetRecommendations';
import * as budgetHook from '@/hooks/useBudgetRecommendations';

// Mock the hook
vi.mock('@/hooks/useBudgetRecommendations');
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

const mockUseBudgetRecommendations = vi.mocked(budgetHook.useBudgetRecommendations);

describe('BudgetRecommendations', () => {
  const mockHookReturn = {
    data: null,
    loading: false,
    error: null,
    lastUpdated: undefined,
    fetchRecommendations: vi.fn(),
    refreshRecommendations: vi.fn(),
    getBudgetPerformance: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseBudgetRecommendations.mockReturnValue(mockHookReturn);
  });

  describe('Loading States', () => {
    it('should show loading skeleton when loading and no data', () => {
      mockUseBudgetRecommendations.mockReturnValue({
        ...mockHookReturn,
        loading: true,
        data: null
      });

      render(<BudgetRecommendations />);

      // Check for loading elements (skeletons)
      expect(screen.getAllByTestId('skeleton')).toBeDefined();
    });

    it('should not show loading skeleton when data exists', () => {
      mockUseBudgetRecommendations.mockReturnValue({
        ...mockHookReturn,
        loading: true,
        data: {
          recommendations: [],
          templates: [],
          totalPotentialSavings: 0,
          highConfidenceRecommendations: [],
          emergencyFundStatus: { hasRecommendation: false }
        }
      });

      render(<BudgetRecommendations />);

      expect(screen.queryByTestId('skeleton')).toBeNull();
    });
  });

  describe('Error States', () => {
    it('should show error message when there is an error', () => {
      mockUseBudgetRecommendations.mockReturnValue({
        ...mockHookReturn,
        error: 'Failed to load budget recommendations'
      });

      render(<BudgetRecommendations />);

      expect(screen.getByText('Failed to Load Budget Recommendations')).toBeInTheDocument();
      expect(screen.getByText('Failed to load budget recommendations')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should call refresh when try again button is clicked', async () => {
      mockUseBudgetRecommendations.mockReturnValue({
        ...mockHookReturn,
        error: 'Test error'
      });

      render(<BudgetRecommendations />);

      const tryAgainButton = screen.getByText('Try Again');
      fireEvent.click(tryAgainButton);

      expect(mockHookReturn.refreshRecommendations).toHaveBeenCalled();
    });
  });

  describe('Income Input', () => {
    it('should render monthly income input section', () => {
      render(<BudgetRecommendations />);

      expect(screen.getByText('Monthly Income Setup')).toBeInTheDocument();
      expect(screen.getByLabelText('Monthly Income')).toBeInTheDocument();
      expect(screen.getByText('Update Recommendations')).toBeInTheDocument();
    });

    it('should handle income input changes', async () => {
      render(<BudgetRecommendations />);

      const incomeInput = screen.getByLabelText('Monthly Income');
      fireEvent.change(incomeInput, { target: { value: '5000' } });

      expect(incomeInput.value).toBe('5000');
    });

    it('should call fetchRecommendations when update button is clicked', async () => {
      render(<BudgetRecommendations />);

      const incomeInput = screen.getByLabelText('Monthly Income');
      const updateButton = screen.getByText('Update Recommendations');

      fireEvent.change(incomeInput, { target: { value: '5000' } });
      fireEvent.click(updateButton);

      expect(mockHookReturn.fetchRecommendations).toHaveBeenCalledWith({ monthlyIncome: 5000 });
    });

    it('should disable update button when income is zero or empty', () => {
      render(<BudgetRecommendations />);

      const updateButton = screen.getByText('Update Recommendations');
      expect(updateButton).toBeDisabled();

      const incomeInput = screen.getByLabelText('Monthly Income');
      fireEvent.change(incomeInput, { target: { value: '0' } });
      expect(updateButton).toBeDisabled();
    });
  });

  describe('Data Display', () => {
    const mockData = {
      recommendations: [
        {
          recommendation_type: 'reduce_category' as const,
          category_name: 'Food',
          current_spending: 800,
          recommended_budget: 600,
          potential_savings: 200,
          confidence_score: 0.85,
          reason: 'This category has high spending potential for optimization',
          action_items: {
            set_monthly_limit: 600,
            track_daily: true,
            review_frequency: 'weekly' as const
          }
        },
        {
          recommendation_type: 'emergency_fund' as const,
          category_name: 'Emergency Fund',
          current_spending: 0,
          recommended_budget: 500,
          potential_savings: 500,
          confidence_score: 0.95,
          reason: 'Building an emergency fund is crucial',
          action_items: {
            start_amount: 100,
            monthly_target: 500,
            automate: true
          }
        }
      ],
      templates: [
        {
          template_name: '50/30/20 Rule',
          template_description: 'A balanced approach to budgeting',
          category_allocations: {
            Housing: 1500,
            Food: 600,
            Transportation: 400,
            Entertainment: 300,
            Savings: 600
          },
          suitability_score: 0.9,
          pros_cons: {
            pros: ['Simple to follow', 'Balanced approach'],
            cons: ['May not fit all situations', 'Requires discipline']
          }
        }
      ],
      totalPotentialSavings: 700,
      highConfidenceRecommendations: [
        {
          recommendation_type: 'emergency_fund' as const,
          category_name: 'Emergency Fund',
          current_spending: 0,
          recommended_budget: 500,
          potential_savings: 500,
          confidence_score: 0.95,
          reason: 'Building an emergency fund is crucial',
          action_items: {
            start_amount: 100,
            monthly_target: 500,
            automate: true
          }
        }
      ],
      emergencyFundStatus: {
        hasRecommendation: true,
        targetAmount: 500,
        currentProgress: 0
      }
    };

    it('should display summary cards when data is available', () => {
      mockUseBudgetRecommendations.mockReturnValue({
        ...mockHookReturn,
        data: mockData
      });

      render(<BudgetRecommendations />);

      expect(screen.getByText('$700')).toBeInTheDocument(); // Potential Savings
      expect(screen.getByText('1')).toBeInTheDocument(); // High-Confidence Tips
      expect(screen.getByText('Needed')).toBeInTheDocument(); // Emergency Fund Status
      expect(screen.getByText('Target: $500')).toBeInTheDocument();
    });

    it('should display recommendations in the recommendations tab', () => {
      mockUseBudgetRecommendations.mockReturnValue({
        ...mockHookReturn,
        data: mockData
      });

      render(<BudgetRecommendations />);

      // Should be on recommendations tab by default
      expect(screen.getByText('Food')).toBeInTheDocument();
      expect(screen.getByText('Emergency Fund')).toBeInTheDocument();
      expect(screen.getByText('$800')).toBeInTheDocument(); // Current Spending
      expect(screen.getByText('$600')).toBeInTheDocument(); // Recommended Budget
      expect(screen.getByText('$200')).toBeInTheDocument(); // Potential Savings
    });

    it('should display templates in the templates tab', async () => {
      mockUseBudgetRecommendations.mockReturnValue({
        ...mockHookReturn,
        data: mockData
      });

      render(<BudgetRecommendations />);

      const templatesTab = screen.getByText('Budget Templates');
      fireEvent.click(templatesTab);

      await waitFor(() => {
        expect(screen.getByText('50/30/20 Rule')).toBeInTheDocument();
        expect(screen.getByText('A balanced approach to budgeting')).toBeInTheDocument();
        expect(screen.getByText('$1,500')).toBeInTheDocument(); // Housing allocation
        expect(screen.getByText('Simple to follow')).toBeInTheDocument(); // Pros
        expect(screen.getByText('May not fit all situations')).toBeInTheDocument(); // Cons
      });
    });

    it('should show confidence badges correctly', () => {
      mockUseBudgetRecommendations.mockReturnValue({
        ...mockHookReturn,
        data: mockData
      });

      render(<BudgetRecommendations />);

      expect(screen.getByText('85% confidence')).toBeInTheDocument();
      expect(screen.getByText('95% confidence')).toBeInTheDocument();
    });

    it('should display action items for recommendations', () => {
      mockUseBudgetRecommendations.mockReturnValue({
        ...mockHookReturn,
        data: mockData
      });

      render(<BudgetRecommendations />);

      expect(screen.getByText('Action Items')).toBeInTheDocument();
      expect(screen.getByText(/Set monthly limit: \$600/)).toBeInTheDocument();
      expect(screen.getByText('Enable daily expense tracking')).toBeInTheDocument();
      expect(screen.getByText('Review weekly')).toBeInTheDocument();
      expect(screen.getByText(/Start with: \$100/)).toBeInTheDocument();
      expect(screen.getByText('Set up automatic transfers')).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no recommendations are available', () => {
      mockUseBudgetRecommendations.mockReturnValue({
        ...mockHookReturn,
        data: {
          recommendations: [],
          templates: [],
          totalPotentialSavings: 0,
          highConfidenceRecommendations: [],
          emergencyFundStatus: { hasRecommendation: false }
        }
      });

      render(<BudgetRecommendations />);

      expect(screen.getByText('No Recommendations Available')).toBeInTheDocument();
      expect(screen.getByText('Add your monthly income to get personalized budget recommendations')).toBeInTheDocument();
    });

    it('should show empty state for templates when none are available', async () => {
      mockUseBudgetRecommendations.mockReturnValue({
        ...mockHookReturn,
        data: {
          recommendations: [],
          templates: [],
          totalPotentialSavings: 0,
          highConfidenceRecommendations: [],
          emergencyFundStatus: { hasRecommendation: false }
        }
      });

      render(<BudgetRecommendations />);

      const templatesTab = screen.getByText('Budget Templates');
      fireEvent.click(templatesTab);

      await waitFor(() => {
        expect(screen.getByText('No Budget Templates Available')).toBeInTheDocument();
        expect(screen.getByText('Enter your monthly income to get personalized budget templates')).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should switch between tabs correctly', async () => {
      mockUseBudgetRecommendations.mockReturnValue({
        ...mockHookReturn,
        data: {
          recommendations: [],
          templates: [],
          totalPotentialSavings: 0,
          highConfidenceRecommendations: [],
          emergencyFundStatus: { hasRecommendation: false }
        }
      });

      render(<BudgetRecommendations />);

      // Should start on recommendations tab
      expect(screen.getByText('No Recommendations Available')).toBeInTheDocument();

      // Switch to templates tab
      fireEvent.click(screen.getByText('Budget Templates'));
      await waitFor(() => {
        expect(screen.getByText('No Budget Templates Available')).toBeInTheDocument();
      });

      // Switch to analysis tab
      fireEvent.click(screen.getByText('Analysis'));
      await waitFor(() => {
        // Analysis tab should show charts or empty state
        expect(screen.getByText('Analysis')).toBeInTheDocument();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should call refresh when refresh button is clicked', () => {
      render(<BudgetRecommendations />);

      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);

      expect(mockHookReturn.refreshRecommendations).toHaveBeenCalled();
    });

    it('should show loading state on refresh button when loading', () => {
      mockUseBudgetRecommendations.mockReturnValue({
        ...mockHookReturn,
        loading: true
      });

      render(<BudgetRecommendations />);

      const refreshButton = screen.getByText('Refresh');
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('Currency Formatting', () => {
    it('should format currency values correctly', () => {
      const mockDataWithLargeNumbers = {
        recommendations: [
          {
            recommendation_type: 'reduce_category' as const,
            category_name: 'Test',
            current_spending: 1234.56,
            recommended_budget: 987.89,
            potential_savings: 246.67,
            confidence_score: 0.8,
            reason: 'Test reason',
            action_items: {}
          }
        ],
        templates: [],
        totalPotentialSavings: 1234.56,
        highConfidenceRecommendations: [],
        emergencyFundStatus: { hasRecommendation: false }
      };

      mockUseBudgetRecommendations.mockReturnValue({
        ...mockHookReturn,
        data: mockDataWithLargeNumbers
      });

      render(<BudgetRecommendations />);

      // Should format without decimal places for display
      expect(screen.getByText('$1,235')).toBeInTheDocument(); // Potential Savings card
      expect(screen.getByText('$988')).toBeInTheDocument(); // Recommended Budget
      expect(screen.getByText('$247')).toBeInTheDocument(); // Potential Savings in recommendation
    });
  });

  describe('Last Updated Display', () => {
    it('should show last updated time when available', () => {
      const lastUpdated = new Date('2023-08-26T10:30:00');
      mockUseBudgetRecommendations.mockReturnValue({
        ...mockHookReturn,
        lastUpdated,
        data: {
          recommendations: [],
          templates: [],
          totalPotentialSavings: 0,
          highConfidenceRecommendations: [],
          emergencyFundStatus: { hasRecommendation: false }
        }
      });

      render(<BudgetRecommendations />);

      expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
      expect(screen.getByText(lastUpdated.toLocaleString())).toBeInTheDocument();
    });

    it('should not show last updated when not available', () => {
      mockUseBudgetRecommendations.mockReturnValue({
        ...mockHookReturn,
        lastUpdated: undefined,
        data: {
          recommendations: [],
          templates: [],
          totalPotentialSavings: 0,
          highConfidenceRecommendations: [],
          emergencyFundStatus: { hasRecommendation: false }
        }
      });

      render(<BudgetRecommendations />);

      expect(screen.queryByText(/Last updated:/)).toBeNull();
    });
  });
});