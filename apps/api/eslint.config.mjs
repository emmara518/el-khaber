import { node } from '@khabir/config/eslint/node';

export default [
  ...node,
  { ignores: ['dist/**'] },
  // CommonJS QA scripts must use require() — ESM import syntax is a
  // syntax error in .cjs files, so the TS rule does not apply here.
  {
    files: ['**/*.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
];
