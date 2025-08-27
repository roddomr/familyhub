import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'
import { mockUser } from '@/test/mocks/handlers'

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ 
        data: { subscription: { unsubscribe: vi.fn() } } 
      }))
    }
  }
}))

// Mock useLogger
vi.mock('@/hooks/useLogger', () => ({
  useLogger: () => ({
    logInfo: vi.fn(),
    logError: vi.fn()
  })
}))

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

describe('AuthContext', () => {
  it('provides initial auth state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.user).toBe(null)
    expect(result.current.loading).toBe(true)
    expect(typeof result.current.signIn).toBe('function')
    expect(typeof result.current.signUp).toBe('function')
    expect(typeof result.current.signOut).toBe('function')
  })

  it('throws error when used outside provider', () => {
    // Mock console.error to avoid test output noise
    const originalError = console.error
    console.error = vi.fn()

    expect(() => {
      renderHook(() => useAuth())
    }).toThrow('useAuth must be used within an AuthProvider')

    console.error = originalError
  })
})