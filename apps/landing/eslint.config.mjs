import { next } from '@khabir/config/eslint/next';

export default [
  ...next,
  { ignores: ['.next/**', 'next-env.d.ts'] },
];
