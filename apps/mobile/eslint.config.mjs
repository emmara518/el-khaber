import { reactNative } from '@khabir/config/eslint/react-native';

export default [...reactNative, { ignores: ['.expo/**', 'node_modules/**'] }];
