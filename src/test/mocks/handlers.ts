import { http, HttpResponse } from 'msw'

// Mock data for testing
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  user_metadata: {
    name: 'Test User'
  }
}

export const mockFamily = {
  id: 'test-family-id',
  name: 'Test Family',
  description: 'A test family',
  invite_code: 'TEST123',
  created_by: mockUser.id,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

export const mockAccount = {
  id: 'test-account-id',
  family_id: mockFamily.id,
  name: 'Test Checking',
  type: 'checking',
  balance: 1500.50,
  currency: 'USD',
  is_active: true,
  created_by: mockUser.id,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

export const mockTransaction = {
  id: 'test-transaction-id',
  family_id: mockFamily.id,
  account_id: mockAccount.id,
  category_id: 'test-category-id',
  created_by: mockUser.id,
  description: 'Test transaction',
  amount: 50.00,
  type: 'expense',
  date: '2024-01-01',
  notes: 'Test notes',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

export const mockCategory = {
  id: 'test-category-id',
  family_id: mockFamily.id,
  name: 'Groceries',
  description: 'Food and household essentials',
  color: '#22C55E',
  icon: 'ShoppingCart',
  type: 'expense',
  is_default: true,
  created_at: '2024-01-01T00:00:00Z'
}

// Request handlers for Supabase API
export const handlers = [
  // Auth endpoints
  http.post('*/auth/v1/token*', () => {
    return HttpResponse.json({
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
      user: mockUser
    })
  }),

  http.get('*/auth/v1/user', () => {
    return HttpResponse.json(mockUser)
  }),

  http.post('*/auth/v1/logout', () => {
    return HttpResponse.json({}, { status: 204 })
  }),

  // Family endpoints
  http.get('*/rest/v1/families*', () => {
    return HttpResponse.json([mockFamily])
  }),

  http.post('*/rest/v1/families', () => {
    return HttpResponse.json(mockFamily, { status: 201 })
  }),

  // Family members endpoints
  http.get('*/rest/v1/family_members*', () => {
    return HttpResponse.json([{
      id: 'test-member-id',
      family_id: mockFamily.id,
      user_id: mockUser.id,
      role: 'admin',
      joined_at: '2024-01-01T00:00:00Z',
      families: mockFamily
    }])
  }),

  // Financial accounts endpoints
  http.get('*/rest/v1/financial_accounts*', () => {
    return HttpResponse.json([mockAccount])
  }),

  http.post('*/rest/v1/financial_accounts', () => {
    return HttpResponse.json(mockAccount, { status: 201 })
  }),

  // Transactions endpoints
  http.get('*/rest/v1/transactions*', () => {
    return HttpResponse.json([{
      ...mockTransaction,
      transaction_categories: mockCategory,
      financial_accounts: {
        name: mockAccount.name,
        type: mockAccount.type
      }
    }])
  }),

  http.post('*/rest/v1/transactions', () => {
    return HttpResponse.json(mockTransaction, { status: 201 })
  }),

  // Categories endpoints
  http.get('*/rest/v1/transaction_categories*', () => {
    return HttpResponse.json([mockCategory])
  }),

  // Budgets endpoints
  http.get('*/rest/v1/budgets*', () => {
    return HttpResponse.json([])
  }),

  // Logs endpoints
  http.get('*/rest/v1/logs*', () => {
    return HttpResponse.json([])
  }),

  http.post('*/rest/v1/logs', () => {
    return HttpResponse.json({}, { status: 201 })
  }),

  http.get('*/rest/v1/recent_errors*', () => {
    return HttpResponse.json([])
  }),

  // RPC endpoints
  http.post('*/rest/v1/rpc/get_user_logs', () => {
    return HttpResponse.json([])
  }),

  http.post('*/rest/v1/rpc/create_family_with_logging', () => {
    return HttpResponse.json({
      success: true,
      family: mockFamily
    })
  }),

  // Catch-all for unhandled requests
  http.all('*', ({ request }) => {
    console.warn(`Unhandled request: ${request.method} ${request.url}`)
    return HttpResponse.json({ error: 'Not found' }, { status: 404 })
  })
]