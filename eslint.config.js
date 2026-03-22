import stylistic from '@stylistic/eslint-plugin';
import perfectionist from 'eslint-plugin-perfectionist';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  tseslint.configs.eslintRecommended,
  ...tseslint.configs.recommended,
  stylistic.configs.customize({
    indent: 2,
    jsx: true,
    semi: true,
  }),
  perfectionist.configs['recommended-natural'],
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/.wrangler/**',
    ],
  },
);
