/**
 * Project-level React Native autolinking overrides (Android QA build).
 *
 * The locked `expo@52.0.49` package keeps the legacy Gradle namespace
 * `expo.core`, while its Kotlin entry point lives in
 * `expo.modules.ExpoModulesPackage`. The generic autolink fallback derives
 * `import expo.core.ExpoModulesPackage;` from the namespace and breaks
 * `:app:compileDebugJavaWithJavac`. This explicit, documented override pins
 * the import/instance strings the package itself declares in its own
 * `react-native.config.js` (`packageImportPath:
 * 'import expo.modules.ExpoModulesPackage;'`), so the generated
 * `PackageList.java` compiles against the installed sources.
 *
 * Scope: Android native codegen only. No runtime, JS, or iOS behavior
 * changes. Remove once the locked Expo/RN set is upgraded past this
 * namespace mismatch.
 */
module.exports = {
  dependencies: {
    expo: {
      platforms: {
        android: {
          packageImportPath: 'import expo.modules.ExpoModulesPackage;',
          packageInstance: 'new ExpoModulesPackage()',
        },
      },
    },
  },
};
