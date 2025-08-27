import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { LanguageProvider } from '@/contexts/LanguageContext'

// Mock i18n to avoid initialization issues
vi.mock('@/i18n', () => ({
  default: {
    use: vi.fn().mockReturnThis(),
    init: vi.fn().mockResolvedValue({}),
    t: (key: string) => key,
    changeLanguage: vi.fn().mockResolvedValue({}),
    language: 'en'
  }
}))

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: vi.fn().mockResolvedValue({}),
      language: 'en'
    }
  }),
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn()
  }
}))

// Custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
        gcTime: 0, // Disable caching
      },
    },
  })

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything from React Testing Library
export * from '@testing-library/react'
export { customRender as render }

// Common test utilities
export const mockConsoleError = () => {
  const originalError = console.error
  const mockedError = vi.fn()
  console.error = mockedError
  
  return {
    mockError: mockedError,
    restore: () => {
      console.error = originalError
    }
  }
}

export const mockConsoleWarn = () => {
  const originalWarn = console.warn
  const mockedWarn = vi.fn()
  console.warn = mockedWarn
  
  return {
    mockWarn: mockedWarn,
    restore: () => {
      console.warn = originalWarn
    }
  }
}

// Wait for async operations to complete
export const waitForLoading = async () => {
  await new Promise(resolve => setTimeout(resolve, 0))
}

// Mock user data for testing
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  user_metadata: {
    name: 'Test User'
  },
  ...overrides
})

// Mock family data for testing
export const createMockFamily = (overrides = {}) => ({
  id: 'test-family-id',
  name: 'Test Family',
  description: 'A test family',
  invite_code: 'TEST123',
  created_by: 'test-user-id',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides
})

// Mock transaction data for testing
export const createMockTransaction = (overrides = {}) => ({
  id: 'test-transaction-id',
  family_id: 'test-family-id',
  account_id: 'test-account-id',
  category_id: 'test-category-id',
  created_by: 'test-user-id',
  description: 'Test transaction',
  amount: 50.00,
  type: 'expense' as const,
  date: '2024-01-01',
  notes: 'Test notes',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides
})

// Mock account data for testing
export const createMockAccount = (overrides = {}) => ({
  id: 'test-account-id',
  family_id: 'test-family-id',
  name: 'Test Checking',
  type: 'checking' as const,
  balance: 1500.50,
  currency: 'USD',
  is_active: true,
  created_by: 'test-user-id',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides
})