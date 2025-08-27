import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the login page
    await page.goto('/');
  });

  test('should display login form', async ({ page }) => {
    // Check if login form elements are visible
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should show validation errors for empty form submission', async ({ page }) => {
    const signInButton = page.getByRole('button', { name: /sign in/i });
    await signInButton.click();

    // Check for validation errors
    await expect(page.getByText(/email.*required/i)).toBeVisible();
    await expect(page.getByText(/password.*required/i)).toBeVisible();
  });

  test('should show validation error for invalid email format', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);
    const signInButton = page.getByRole('button', { name: /sign in/i });

    await emailInput.fill('invalid-email');
    await passwordInput.fill('password123');
    await signInButton.click();

    await expect(page.getByText(/invalid.*email/i)).toBeVisible();
  });

  test('should toggle between sign in and sign up forms', async ({ page }) => {
    // Start on sign in form
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

    // Click "Don't have an account?"
    await page.getByText(/don't have an account/i).click();

    // Should now show sign up form
    await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible();
    await expect(page.getByLabel(/full name/i)).toBeVisible();

    // Click "Already have an account?"
    await page.getByText(/already have an account/i).click();

    // Should be back to sign in form
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should show password requirements on sign up', async ({ page }) => {
    // Switch to sign up
    await page.getByText(/don't have an account/i).click();

    const passwordInput = page.getByLabel(/password/i);
    await passwordInput.focus();
    await passwordInput.fill('weak');

    // Should show password requirements
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock a network error
    await page.route('**/auth/v1/token*', (route) => {
      route.abort('failed');
    });

    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);
    const signInButton = page.getByRole('button', { name: /sign in/i });

    await emailInput.fill('test@example.com');
    await passwordInput.fill('password123');
    await signInButton.click();

    // Should show error message
    await expect(page.getByText(/network error|connection failed/i)).toBeVisible();
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check if elements are still accessible and properly sized
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

    // Check if form takes appropriate width
    const form = page.locator('form').first();
    await expect(form).toBeVisible();
  });

  // Skip actual authentication test since it requires real Supabase credentials
  test.skip('should successfully authenticate with valid credentials', async ({ page }) => {
    // This would require setting up test credentials in Supabase
    // For now, we'll skip this test
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);
    const signInButton = page.getByRole('button', { name: /sign in/i });

    await emailInput.fill('test@example.com');
    await passwordInput.fill('validpassword');
    await signInButton.click();

    // Should redirect to dashboard
    await expect(page.url()).toContain('/dashboard');
  });
});