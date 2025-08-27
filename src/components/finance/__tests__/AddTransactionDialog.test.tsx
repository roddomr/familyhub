import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/utils/test-utils'
import { AddTransactionDialog } from '../AddTransactionDialog'

// Mock all the hooks
vi.mock('@/hooks/useFinances', () => ({
  useFinances: () => ({
    accounts: [],
    categories: [],
    refreshData: vi.fn()
  })
}))

vi.mock('@/hooks/useFamily', () => ({
  useFamily: () => ({
    currentFamily: { id: 'test-family-id', name: 'Test Family' },
    families: []
  })
}))

vi.mock('@/hooks/useLogger', () => ({
  useLogger: () => ({
    logError: vi.fn(),
    logInfo: vi.fn()
  })
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}))

describe('AddTransactionDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onTransactionAdded: vi.fn()
  }

  it('renders the dialog when open', () => {
    render(<AddTransactionDialog {...defaultProps} />)
    
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<AddTransactionDialog {...defaultProps} open={false} />)
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders form fields', () => {
    render(<AddTransactionDialog {...defaultProps} />)
    
    // Look for input elements
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByText('common.add')).toBeInTheDocument()
    expect(screen.getByText('common.cancel')).toBeInTheDocument()
  })
})