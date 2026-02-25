import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 15000,
    retries: 1,
    reporter: 'list',

    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure'
    },

    projects: [
        {
            name: 'Desktop Chrome',
            use: { ...devices['Desktop Chrome'] }
        },
        {
            name: 'Mobile Safari (iPhone 14)',
            use: { ...devices['iPhone 14'] }
        },
        {
            name: 'Mobile Chrome (Pixel 5)',
            use: { ...devices['Pixel 5'] }
        }
    ],

    // Start dev server automatically
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 20000
    }
});
