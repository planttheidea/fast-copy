import eslint from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tsEslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['.next/*', '.yarn/*', 'node_modules/*']),
  eslint.configs.recommended,
  tsEslint.configs.strictTypeChecked,
  tsEslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/unbound-method': 'off',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
]);
