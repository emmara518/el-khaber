import globals from 'globals';

import { base } from './base.js';

/** ESLint flat config for Node-only projects (NestJS backend, scripts). */
const node = [
  ...base,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
  },
];

export default node;
export { node };

