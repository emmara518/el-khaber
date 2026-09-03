import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';

/** Base ESLint flat config for TypeScript projects. */
const base = tseslint.config(
  {
    ignores: ['dist/**', 'build/**', '.next/**', '.expo/**', 'coverage/**', 'node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { import: importPlugin },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      'import/order': [
        'warn',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      // Disabled because NestJS relies on value imports of injected
      // classes (e.g. `Reflector`, `JwtService`, `PrismaService`) for
      // decorator metadata (`emitDecoratorMetadata`). Marking these as
      // `import type` erases the value at runtime and breaks DI. The
      // `noUnusedLocals` rule still catches genuinely unused imports.
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  prettier,
);

export default base;
export { base };

