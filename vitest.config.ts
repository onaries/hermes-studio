import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

const maxWorkers = process.env.VITEST_MAX_WORKERS ?? '1'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'packages/client/src'),
      electron: resolve(__dirname, 'tests/mocks/electron.ts'),
      '/logo.png': resolve(__dirname, 'packages/client/public/logo.png'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    minWorkers: 1,
    maxWorkers,
    coverage: {
      exclude: ['dist/**', 'coverage/**', 'packages/desktop/release/**'],
    },
  },
})
