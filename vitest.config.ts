import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      exclude: ['**/__helpers__/**'],
      include: ['src/**/*.ts'],
      provider: 'v8',
    },
    include: ['**/__tests__/**/*.ts'],
  },
});
