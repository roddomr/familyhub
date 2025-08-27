# Testing Documentation

## 🧪 Comprehensive Testing Setup

This project includes a complete testing setup with unit tests, integration tests, and end-to-end tests to ensure code quality and reliability.

## 📋 Testing Stack

### Unit & Integration Testing
- **Vitest** - Fast unit testing framework (Vite-native)
- **React Testing Library** - Testing utilities for React components
- **Testing Library User Event** - User interaction simulation
- **MSW (Mock Service Worker)** - API mocking
- **jsdom** - DOM simulation for tests

### End-to-End Testing
- **Playwright** - Cross-browser E2E testing
- **Multiple browsers** - Chrome, Firefox, Safari, Mobile

### Coverage & Reporting
- **V8 Coverage** - Built-in code coverage
- **HTML Reports** - Visual test results
- **GitHub Actions** - Automated CI/CD testing

## 🚀 Available Test Commands

```bash
# Unit & Integration Tests
npm test                    # Run tests in watch mode
npm run test:run           # Run tests once
npm run test:ui            # Open Vitest UI
npm run test:coverage      # Run tests with coverage report
npm run test:watch         # Run tests in watch mode (explicit)

# End-to-End Tests
npm run test:e2e           # Run E2E tests
npm run test:e2e:ui        # Run E2E tests with Playwright UI
npm run test:e2e:headed    # Run E2E tests in headed mode

# Other
npm run lint               # Run ESLint
npx tsc --noEmit          # Type checking
```

## 📁 Test Structure

```
src/
├── test/
│   ├── setup.ts           # Test configuration and global mocks
│   ├── utils/
│   │   └── test-utils.tsx # Custom render functions and utilities
│   └── mocks/
│       ├── server.ts      # MSW server setup
│       └── handlers.ts    # API mock handlers
├── components/
│   ├── ui/
│   │   └── __tests__/     # UI component tests
│   └── finance/
│       └── __tests__/     # Feature component tests
├── hooks/
│   └── __tests__/         # Custom hook tests
├── contexts/
│   └── __tests__/         # Context provider tests
├── lib/
│   └── __tests__/         # Utility function tests
└── pages/
    └── __tests__/         # Page component tests

e2e/                       # End-to-end tests
├── auth.spec.ts          # Authentication flow tests
└── navigation.spec.ts    # Navigation and app structure tests
```

## 🔧 Test Configuration

### Vitest Configuration (`vitest.config.ts`)
- **Environment**: jsdom for DOM simulation
- **Setup Files**: Global test setup and mocks
- **Coverage**: V8 provider with 70% thresholds
- **Aliases**: Same as Vite for consistent imports

### Coverage Thresholds
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

### Excluded from Coverage
- Test files (`*.test.*`, `*.spec.*`)
- Type definitions (`*.d.ts`)
- Test utilities (`src/test/`)
- External service connections
- Build configuration files

## 🎭 Mock Strategy

### API Mocking with MSW
All Supabase API calls are mocked using MSW handlers:

```typescript
// Mock data examples
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  // ... other properties
}

// Request handlers
http.get('*/rest/v1/transactions*', () => {
  return HttpResponse.json([mockTransaction])
})
```

### Browser APIs
- `window.matchMedia` - Responsive design testing
- `IntersectionObserver` - Scroll-based components
- `ResizeObserver` - Size-aware components  
- `localStorage` / `sessionStorage` - Storage APIs

### External Libraries
- **Recharts** - Mocked to avoid canvas rendering issues
- **Supabase Client** - Completely mocked with MSW

## 📊 Test Types & Examples

### 1. Unit Tests - Utilities
```typescript
// src/lib/__tests__/utils.test.ts
describe('cn (className utility)', () => {
  it('merges class names correctly', () => {
    expect(cn('flex', 'items-center')).toBe('flex items-center')
  })
})
```

### 2. Component Tests - UI Components
```typescript
// src/components/ui/__tests__/button.test.tsx
describe('Button', () => {
  it('handles click events', async () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### 3. Hook Tests - Custom Logic
```typescript
// src/hooks/__tests__/useFinances.test.ts
describe('useFinances', () => {
  it('should load financial data successfully', async () => {
    const { result } = renderHook(() => useFinances(), { wrapper })
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    
    expect(result.current.accounts).toHaveLength(1)
  })
})
```

### 4. Integration Tests - Page Components
```typescript
// src/pages/__tests__/Dashboard.test.tsx
describe('Dashboard', () => {
  it('displays financial overview cards', async () => {
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Total Balance')).toBeInTheDocument()
    })
  })
})
```

### 5. Context Tests - State Management
```typescript
// src/contexts/__tests__/AuthContext.test.tsx
describe('AuthContext', () => {
  it('handles sign in success', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    const signInResult = await result.current.signIn('test@example.com', 'password')
    expect(signInResult).toEqual({ error: null })
  })
})
```

### 6. End-to-End Tests - User Flows
```typescript
// e2e/auth.spec.ts
test('should display login form', async ({ page }) => {
  await page.goto('/')
  
  await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible()
  await expect(page.getByLabel(/email/i)).toBeVisible()
})
```

## 🎯 Testing Best Practices

### 1. Test Organization
- **Group related tests** with `describe` blocks
- **Use descriptive test names** that explain the expected behavior
- **Follow AAA pattern**: Arrange, Act, Assert

### 2. Component Testing
- **Test user interactions**, not implementation details
- **Use accessible queries** (`getByRole`, `getByLabelText`)
- **Test different states** (loading, error, success)
- **Mock external dependencies** appropriately

### 3. Hook Testing
- **Use `renderHook`** for testing custom hooks
- **Test async operations** with `waitFor`
- **Verify side effects** and state changes

### 4. API Testing
- **Mock all external API calls** with MSW
- **Test error scenarios** as well as success cases
- **Verify correct API calls** are made

### 5. Accessibility Testing
- **Use semantic HTML** and test with screen readers in mind
- **Test keyboard navigation** where applicable
- **Verify ARIA labels** and roles

## 📈 Continuous Integration

### GitHub Actions Workflow
The project includes automated testing on:
- **Push to main/develop** branches
- **Pull requests** to main/develop branches

### Test Jobs
1. **Unit Tests** - Run Vitest with coverage
2. **E2E Tests** - Run Playwright across multiple browsers
3. **Type Checking** - Verify TypeScript compilation
4. **Build Testing** - Ensure production build works

### Coverage Reporting
- Coverage reports are uploaded to Codecov
- HTML coverage reports available locally
- Playwright test reports saved as artifacts

## 🚨 Common Issues & Solutions

### 1. Mock Issues
```bash
# Clear vi.fn() mocks between tests
beforeEach(() => {
  vi.clearAllMocks()
})
```

### 2. Async Testing
```typescript
// Always use waitFor for async operations
await waitFor(() => {
  expect(result.current.loading).toBe(false)
})
```

### 3. Component Provider Setup
```typescript
// Use custom render with providers
import { render } from '@/test/utils/test-utils' // Not @testing-library/react
```

### 4. MSW Handler Updates
```typescript
// Update MSW handlers for specific tests
beforeEach(() => {
  server.resetHandlers() // Reset to defaults
})
```

## 🏆 Quality Gates

### Pre-commit Checks
- **Linting** passes without errors
- **Type checking** passes
- **Unit tests** pass with coverage thresholds

### Pre-merge Checks
- **All tests** pass (unit + E2E)
- **Coverage** meets minimum thresholds (70%)
- **Build** succeeds for production

### Deployment Checks
- **E2E tests** pass in multiple browsers
- **Performance** tests pass (optional)
- **Security** scans pass (optional)

## 📚 Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [MSW Documentation](https://mswjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

This comprehensive testing setup ensures high code quality, catches regressions early, and provides confidence in deployments. All tests can be run locally and are automatically executed in CI/CD pipelines.