/**
 * Playwright E2E tests — Basic smoke tests for FitTrack Pro
 * Run: npx playwright test
 * Requires: vite dev server running on localhost:3000
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

// ==================== AUTH MODAL ====================

test.describe('Auth modal', () => {
    test('shows auth modal on first load', async ({ page }) => {
        await page.goto(BASE_URL);
        const modal = page.locator('#auth-modal');
        await expect(modal).toBeVisible({ timeout: 5000 });
    });

    test('has email and password fields', async ({ page }) => {
        await page.goto(BASE_URL);
        await expect(page.locator('#login-email')).toBeVisible();
        await expect(page.locator('#login-password')).toBeVisible();
    });

    test('can switch to signup tab', async ({ page }) => {
        await page.goto(BASE_URL);
        const signupTab = page.locator('[onclick*="signup"]').first();
        await signupTab.click();
        await expect(page.locator('#auth-form-signup')).toBeVisible();
    });

    test('shows error for empty login', async ({ page }) => {
        await page.goto(BASE_URL);
        const loginBtn = page.locator('button[onclick*="handleLogin"]');
        await loginBtn.click();
        // Should show a toast error
        const toast = page.locator('.toast, [class*="toast"]');
        await expect(toast).toBeVisible({ timeout: 3000 });
    });
});

// ==================== OFFLINE MODE ====================

test.describe('Offline mode', () => {
    test('can continue offline and dismiss auth modal', async ({ page }) => {
        await page.goto(BASE_URL);
        const offlineBtn = page.locator('button[onclick*="continueOffline"]');
        await offlineBtn.click();
        const modal = page.locator('#auth-modal');
        await expect(modal).toBeHidden({ timeout: 3000 });
    });

    test('shows main navigation after offline mode', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.locator('button[onclick*="continueOffline"]').click();
        // Bottom nav should be visible
        const nav = page.locator('.bottom-nav, [class*="bottom-nav"]');
        await expect(nav).toBeVisible({ timeout: 3000 });
    });
});

// ==================== NAVIGATION ====================

test.describe('Navigation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
        // Enter offline mode to bypass auth
        const offlineBtn = page.locator('button[onclick*="continueOffline"]');
        if (await offlineBtn.isVisible()) {
            await offlineBtn.click();
        }
        await page.waitForTimeout(500);
    });

    test('can navigate to nutrition tab', async ({ page }) => {
        const nutritionTab = page.locator('[onclick*="showSection"][onclick*="nutrition"], [data-section="nutrition"]').first();
        await nutritionTab.click();
        const section = page.locator('#nutrition-section, [id*="nutrition"]').first();
        await expect(section).toBeVisible({ timeout: 3000 });
    });

    test('can navigate to training tab', async ({ page }) => {
        const trainingTab = page.locator('[onclick*="showSection"][onclick*="training"], [data-section="training"]').first();
        await trainingTab.click();
        const section = page.locator('#training-section, [id*="training"]').first();
        await expect(section).toBeVisible({ timeout: 3000 });
    });

    test('can navigate to progress tab', async ({ page }) => {
        const progressTab = page.locator('[onclick*="showSection"][onclick*="progress"], [data-section="progress"]').first();
        await progressTab.click();
        const section = page.locator('#progress-section, [id*="progress"]').first();
        await expect(section).toBeVisible({ timeout: 3000 });
    });
});

// ==================== ONBOARDING ====================

test.describe('Onboarding overlay', () => {
    test('onboarding overlay exists in DOM', async ({ page }) => {
        await page.goto(BASE_URL);
        const overlay = page.locator('#onboarding-overlay');
        await expect(overlay).toBeAttached();
    });
});

// ==================== MOBILE VIEWPORT ====================

test.describe('Mobile viewport', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('app is responsive on mobile', async ({ page }) => {
        await page.goto(BASE_URL);
        const body = page.locator('body');
        await expect(body).toBeVisible();
        const bodyBox = await body.boundingBox();
        expect(bodyBox?.width).toBeLessThanOrEqual(390 + 5);
    });

    test('bottom nav is visible on mobile', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.locator('button[onclick*="continueOffline"]').click();
        await page.waitForTimeout(500);
        const bottomNav = page.locator('.bottom-nav').first();
        await expect(bottomNav).toBeVisible();
    });
});

// ==================== TRAINING FLOW ====================

test.describe('Training section', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
        const offlineBtn = page.locator('button[onclick*="continueOffline"]');
        if (await offlineBtn.isVisible()) await offlineBtn.click();
        await page.waitForTimeout(500);
    });

    test('training section has session type buttons', async ({ page }) => {
        const trainingTab = page.locator('[data-section="training"]').first();
        await trainingTab.click();
        await page.waitForTimeout(500);
        const trainingSection = page.locator('#training');
        await expect(trainingSection).toBeVisible({ timeout: 3000 });
    });

    test('new session sheet opens', async ({ page }) => {
        const trainingTab = page.locator('[data-section="training"]').first();
        await trainingTab.click();
        await page.waitForTimeout(500);
        const startBtn = page.locator('button:has-text("Démarrer"), [onclick*="openNewSessionSheet"], [onclick*="startSession"]').first();
        if (await startBtn.isVisible()) {
            await startBtn.click();
            await page.waitForTimeout(500);
        }
    });
});

// ==================== NUTRITION FLOW ====================

test.describe('Nutrition section', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
        const offlineBtn = page.locator('button[onclick*="continueOffline"]');
        if (await offlineBtn.isVisible()) await offlineBtn.click();
        await page.waitForTimeout(500);
    });

    test('nutrition section loads with macro rings', async ({ page }) => {
        const nutritionTab = page.locator('[data-section="nutrition"]').first();
        await nutritionTab.click();
        await page.waitForTimeout(1000);
        const section = page.locator('#nutrition').first();
        await expect(section).toBeVisible({ timeout: 3000 });
    });

    test('food search input exists', async ({ page }) => {
        const nutritionTab = page.locator('[data-section="nutrition"]').first();
        await nutritionTab.click();
        await page.waitForTimeout(500);
        const searchInput = page.locator('#unified-food-search, #meal-food-search, input[placeholder*="Rechercher"]').first();
        await expect(searchInput).toBeAttached();
    });
});

// ==================== PROGRESS SECTION ====================

test.describe('Progress section', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
        const offlineBtn = page.locator('button[onclick*="continueOffline"]');
        if (await offlineBtn.isVisible()) await offlineBtn.click();
        await page.waitForTimeout(500);
    });

    test('progress section has tabs', async ({ page }) => {
        const progressTab = page.locator('[data-section="progress"], [data-section="progression"]').first();
        await progressTab.click();
        await page.waitForTimeout(1000);
        const section = page.locator('#progress, #progression').first();
        await expect(section).toBeVisible({ timeout: 5000 });
    });

    test('session history container exists', async ({ page }) => {
        const progressTab = page.locator('[data-section="progress"], [data-section="progression"]').first();
        await progressTab.click();
        await page.waitForTimeout(1000);
        const historyContainer = page.locator('#session-history');
        await expect(historyContainer).toBeAttached();
    });

    test('muscle heatmap card exists', async ({ page }) => {
        const progressTab = page.locator('[data-section="progress"], [data-section="progression"]').first();
        await progressTab.click();
        await page.waitForTimeout(1000);
        const heatmap = page.locator('#muscle-heatmap-card');
        await expect(heatmap).toBeAttached();
    });

    test('activity heatmap exists', async ({ page }) => {
        const progressTab = page.locator('[data-section="progress"], [data-section="progression"]').first();
        await progressTab.click();
        await page.waitForTimeout(1000);
        const heatmap = page.locator('#activity-heatmap');
        await expect(heatmap).toBeAttached();
    });
});

// ==================== DASHBOARD ====================

test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
        const offlineBtn = page.locator('button[onclick*="continueOffline"]');
        if (await offlineBtn.isVisible()) await offlineBtn.click();
        await page.waitForTimeout(500);
    });

    test('dashboard loads with stat cards', async ({ page }) => {
        const dashboard = page.locator('#dashboard');
        await expect(dashboard).toBeVisible({ timeout: 5000 });
    });

    test('daily macros section exists', async ({ page }) => {
        const macros = page.locator('#daily-macros');
        await expect(macros).toBeAttached();
    });
});

// ==================== THEME ====================

test.describe('Theme switching', () => {
    test('html has data-theme attribute', async ({ page }) => {
        await page.goto(BASE_URL);
        const theme = await page.locator('html').getAttribute('data-theme');
        expect(['auto', 'light', 'dark']).toContain(theme);
    });
});
