import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useFinances } from '../useFinances'

// Mock the AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    loading: false,
  })
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useFinances', () => {
  it('should return initial state', () => {
    const { result } = renderHook(() => useFinances(), {
      wrapper: createWrapper(),
    })

    expect(result.current.loading).toBe(true)
    expect(result.current.accounts).toEqual([])
    expect(result.current.recentTransactions).toEqual([])
    expect(result.current.categories).toEqual([])
    expect(result.current.budgets).toEqual([])
    expect(result.current.totalBalance).toBe(0)
    expect(result.current.monthlyIncome).toBe(0)
    expect(result.current.monthlyExpenses).toBe(0)
  })

  it('should provide refreshData function', () => {
    const { result } = renderHook(() => useFinances(), {
      wrapper: createWrapper(),
    })

    expect(typeof result.current.refreshData).toBe('function')
  })
})