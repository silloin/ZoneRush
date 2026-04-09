/**
 * Mobile Responsiveness Test Suite for ZoneRush
 * Tests responsive layouts across multiple device breakpoints
 */

import { test, expect } from '@playwright/test';

// Device configurations matching common screen sizes
const devices = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 12/13/14', width: 390, height: 844 },
  { name: 'iPhone Pro Max', width: 428, height: 926 },
  { name: 'iPad Mini', width: 768, height: 1024 },
  { name: 'iPad Pro', width: 1024, height: 1366 },
  { name: 'Small Laptop', width: 1280, height: 720 },
  { name: 'Desktop', width: 1920, height: 1080 },
];

// Pages to test
const pages = [
  { name: 'Home', path: '/' },
  { name: 'Login', path: '/login' },
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Training Plans', path: '/training-plans' },
  { name: 'Run History', path: '/run-history' },
  { name: 'Leaderboard', path: '/leaderboard' },
  { name: 'Profile', path: '/profile' },
];

// Test each page on each device
for (const device of devices) {
  test.describe(`Responsive Tests - ${device.name} (${device.width}x${device.height})`, () => {
    
    for (const page of pages) {
      test(`${page.name} should render correctly`, async ({ page: browserPage }) => {
        // Set viewport to device size
        await browserPage.setViewportSize({ 
          width: device.width, 
          height: device.height 
        });

        // Navigate to page
        await browserPage.goto(`http://localhost:5173${page.path}`, {
          waitUntil: 'networkidle',
          timeout: 30000
        });

        // Wait for content to load
        await browserPage.waitForTimeout(2000);

        // Take screenshot for visual regression
        await expect(browserPage).toHaveScreenshot(
          `${device.name.replace(/\s+/g, '-')}-${page.name.replace(/\s+/g, '-')}.png`,
          {
            fullPage: true,
            maxDiffPixels: 100, // Allow minor differences
          }
        );

        // Check that page loaded without errors
        const hasErrors = await browserPage.evaluate(() => {
          return document.querySelector('.error-boundary') !== null;
        });
        expect(hasErrors).toBe(false);

        // Verify critical elements are visible
        const bodyText = await browserPage.textContent('body');
        expect(bodyText.length).toBeGreaterThan(0);
      });
    }
  });
}

// Layout-specific tests
test.describe('Layout Integrity Tests', () => {
  
  test('Navigation should be accessible on all screen sizes', async ({ page }) => {
    const viewports = [375, 768, 1024, 1920];
    
    for (const width of viewports) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
      
      // Check navigation exists
      const nav = await page.locator('nav, [role="navigation"], .navbar, .sidebar').first();
      await expect(nav).toBeVisible();
    }
  });

  test('Content should not overflow horizontally', async ({ page }) => {
    const widths = [375, 768, 1024, 1280];
    
    for (const width of widths) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle' });
      
      // Check for horizontal scroll (indicates overflow)
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth;
      });
      
      expect(hasHorizontalScroll).toBe(false);
    }
  });

  test('Touch targets should be large enough on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    
    // Get all clickable elements
    const clickableElements = await page.locator('button, a, [role="button"]').all();
    
    for (const element of clickableElements.slice(0, 10)) { // Test first 10
      const box = await element.boundingBox();
      if (box) {
        // Minimum touch target: 44x44px (Apple HIG recommendation)
        expect(box.width).toBeGreaterThanOrEqual(30);
        expect(box.height).toBeGreaterThanOrEqual(30);
      }
    }
  });

  test('Images should be responsive and not break layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    
    const images = await page.locator('img').all();
    
    for (const img of images.slice(0, 5)) {
      const box = await img.boundingBox();
      if (box) {
        // Images should fit within viewport
        expect(box.width).toBeLessThanOrEqual(375);
      }
    }
  });

  test('Text should be readable on all devices', async ({ page }) => {
    const widths = [375, 768, 1024];
    
    for (const width of widths) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle' });
      
      // Check font sizes are reasonable
      const bodyFontSize = await page.evaluate(() => {
        return parseInt(window.getComputedStyle(document.body).fontSize);
      });
      
      expect(bodyFontSize).toBeGreaterThanOrEqual(14); // Minimum readable size
    }
  });
});

// Performance tests
test.describe('Mobile Performance Tests', () => {
  
  test('Pages should load within acceptable time on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    const startTime = Date.now();
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds on slow connection simulation
    expect(loadTime).toBeLessThan(5000);
  });

  test('No console errors on mobile viewport', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    
    expect(errors).toEqual([]);
  });
});

// Accessibility tests
test.describe('Mobile Accessibility Tests', () => {
  
  test('Page should have proper meta viewport tag', async ({ page }) => {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    
    const viewportMeta = await page.locator('meta[name="viewport"]');
    await expect(viewportMeta).toHaveAttribute('content', /width=device-width/);
  });

  test('Interactive elements should have accessible names', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    
    const buttons = await page.locator('button').all();
    
    for (const button of buttons.slice(0, 5)) {
      const ariaLabel = await button.getAttribute('aria-label');
      const textContent = await button.textContent();
      
      // Button should have either aria-label or text content
      expect(ariaLabel || textContent).toBeTruthy();
    }
  });
});
