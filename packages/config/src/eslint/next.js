import reactHooks from 'eslint-plugin-react-hooks';

import { base } from './base.js';

/** ESLint flat config for Next.js (Admin, Landing). */
const next = [
  ...base,
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
];

export default next;
export { next };

