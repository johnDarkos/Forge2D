import { configDefaults, defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'tests/browser/**'],
      setupFiles: ['./src/test/setup.ts'],
      clearMocks: true,
      restoreMocks: true,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/test/**', 'src/main.tsx', 'src/vite-env.d.ts'],
        reporter: ['text', 'html'],
        // Пороги чуть ниже достигнутого: падение покрытия видно, шум от округления — нет.
        thresholds: { statements: 90, branches: 85, functions: 95, lines: 94 },
      },
    },
  }),
)
