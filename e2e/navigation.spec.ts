import { test, expect } from '@playwright/test';

test.describe('Navigation and App Structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have correct page title and favicon', async ({ page }) => {
    await expect(page).toHaveTitle(/Family Hub/i);
    
    // Check if favicon is loaded
    const favicon = page.locator('link[rel="icon"]');
    await expect(favicon).toHaveAttribute('href', /favicon/);
  });

  test('should show PWA manifest', async ({ page }) => {
    // Check if PWA manifest is linked
    const manifest = page.locator('link[rel="manifest"]');
    await expect(manifest).toHaveAttribute('href', '/manifest.webmanifest');
  });

  test('should be installable as PWA', async ({ page }) => {
    // Check for PWA meta tags
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#3b82f6');
    await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes');
  });

  test('should handle not found routes', async ({ page }) => {
    await page.goto('/non-existent-route');
    
    // Should show 404 page or redirect to home
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/(login|not-found|404)?$/);
  });

  test('should have proper meta tags for SEO', async ({ page }) => {
    // Check for important meta tags
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /family management/i);
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /width=device-width/);
  });

  test('should load CSS and JavaScript resources', async ({ page }) => {
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Check if main CSS is loaded
    const styleSheets = await page.evaluate(() => Array.from(document.styleSheets).length);
    expect(styleSheets).toBeGreaterThan(0);

    // Check if main JS is loaded (React should be available)
    const hasReact = await page.evaluate(() => typeof window.React !== 'undefined' || document.querySelector('#root')?.hasChildNodes());
    expect(hasReact).toBeTruthy();
  });

  test('should be accessible with keyboard navigation', async ({ page }) => {
    // Test tab navigation
    await page.keyboard.press('Tab');
    
    // Should have focus on first focusable element
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON', 'A'].includes(focusedElement || '')).toBeTruthy();
  });

  test('should handle different screen sizes', async ({ page }) => {
    // Test desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('body')).toBeVisible();

    // Test tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('body')).toBeVisible();

    // Test mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should not have any console errors
    expect(errors.length).toBe(0);
  });

  test('should have proper ARIA labels and roles', async ({ page }) => {
    // Check for main landmark
    const main = page.locator('main, [role="main"]');
    await expect(main.first()).toBeVisible();

    // Check for proper button roles
    const buttons = page.locator('button, [role="button"]');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('should support language switching', async ({ page }) => {
    // Look for language selector (if visible on login page)
    const languageSelector = page.locator('[data-testid="language-selector"], select[aria-label*="language"], button[aria-label*="language"]');
    
    if (await languageSelector.isVisible()) {
      await languageSelector.click();
      
      // Should show language options
      await expect(page.getByText(/english|español|spanish/i)).toBeVisible();
    }
  });

  test('should handle slow network conditions', async ({ page }) => {
    // Simulate slow network
    await page.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
      route.continue();
    });

    await page.goto('/');
    
    // Should still load within reasonable time
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('should show loading states appropriately', async ({ page }) => {
    await page.goto('/');
    
    // Look for loading indicators (spinner, skeleton, etc.)
    const possibleLoadingStates = [
      page.getByText(/loading/i),
      page.locator('[data-testid*="loading"]'),
      page.locator('[class*="loading"]'),
      page.locator('[class*="spinner"]'),
      page.locator('[class*="skeleton"]')
    ];

    // At least one loading state should be visible initially (or content should load quickly)
    let hasLoadingState = false;
    for (const loader of possibleLoadingStates) {
      if (await loader.isVisible({ timeout: 1000 }).catch(() => false)) {
        hasLoadingState = true;
        break;
      }
    }

    // Either we show loading states or content loads immediately
    const hasContent = await page.locator('form, main, [role="main"]').isVisible();
    expect(hasLoadingState || hasContent).toBeTruthy();
  });
});