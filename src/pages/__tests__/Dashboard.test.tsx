import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/utils/test-utils'
import { Dashboard } from '../Dashboard'

// Mock all the hooks with simple data
vi.mock('@/hooks/useFamily', () => ({
  useFamily: () => ({
    currentFamily: { id: 'test-family-id', name: 'Test Family' },
    families: [],
    loading: false
  })
}))

vi.mock('@/hooks/useFinances', () => ({
  useFinances: () => ({
    accounts: [],
    recentTransactions: [],
    categories: [],
    budgets: [],
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    loading: false,
    error: null,
    refreshData: vi.fn()
  })
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    loading: false
  })
}))

// Mock Recharts to avoid canvas issues
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chart-container">{children}</div>
  ),
  BarChart: () => <div data-testid="bar-chart">Bar Chart</div>,
  LineChart: () => <div data-testid="line-chart">Line Chart</div>,
  PieChart: () => <div data-testid="pie-chart">Pie Chart</div>,
  Bar: () => null,
  Line: () => null,
  Pie: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}))

describe('Dashboard', () => {
  it('renders the dashboard', () => {
    render(<Dashboard />)
    
    // Should render without crashing
    expect(screen.getByText('finance.totalBalance')).toBeInTheDocument()
  })

  it('shows financial overview sections', () => {
    render(<Dashboard />)
    
    expect(screen.getByText('finance.totalBalance')).toBeInTheDocument()
    expect(screen.getByText('finance.monthlyIncome')).toBeInTheDocument()
    expect(screen.getByText('finance.monthlyExpenses')).toBeInTheDocument()
  })

  it('renders charts', () => {
    render(<Dashboard />)
    
    expect(screen.getByTestId('chart-container')).toBeInTheDocument()
  })
})