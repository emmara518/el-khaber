import reactHooks from 'eslint-plugin-react-hooks';

import { base } from './base.js';

/** ESLint flat config for React Native projects. */
const reactNative = [
  ...base,
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
];

export default reactNative;
export { reactNative };

