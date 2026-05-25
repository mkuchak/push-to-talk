import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    testTimeout: 60_000,
    include: ['test/**/*.test.ts'],
    exclude: ['**/node_modules/**'],
    setupFiles: ['./test/setup.ts'],
    passWithNoTests: true,
  },
})
