import { node } from '@khabir/config/eslint/node';
import { reactNative } from '@khabir/config/eslint/react-native';

// Node globals from the shared preset, scoped to build/utility scripts and
// Expo config plugins only (plain CommonJS files, e.g.
// scripts/expo-export-embed-cli.js, plugins/with-android-release-hardening.js).
const nodeEnv = node.find((entry) => entry.languageOptions?.globals);

export default [
  ...reactNative,
  ...(nodeEnv
    ? [
        {
          files: ['scripts/**/*.js', 'plugins/**/*.js'],
          languageOptions: nodeEnv.languageOptions,
          rules: { '@typescript-eslint/no-require-imports': 'off' },
        },
      ]
    : []),
  { ignores: ['.expo/**', 'node_modules/**'] },
];
