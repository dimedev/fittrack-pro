import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'happy-dom',
        globals: true,
        include: ['tests/unit/**/*.test.js'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            reportsDirectory: './tests/coverage'
        }
    }
});
