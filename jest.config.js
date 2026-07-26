module.exports = {
  // Preset oficial de Expo (deriva del de react-native, ver node_modules/jest-expo/jest-preset.js) —
  // trae mocks para expo-modules-core/EventEmitter, NativeModulesProxy, etc. que el preset
  // plano de react-native no conoce.
  preset: 'jest-expo',
  // setupFiles del preset no se mergea automáticamente con el nuestro —
  // hay que incluir explícitamente el de jest-expo además del de
  // gesture-handler (NativeModule mockeado) y el propio (AsyncStorage mock).
  setupFiles: [
    require.resolve('jest-expo/src/preset/setup.js'),
    require.resolve('react-native-gesture-handler/jestSetup.js'),
    require.resolve('./jest.setup.js'),
  ],
  // jest-expo ya cubre expo/@expo/@react-navigation/react-native-svg, pero no conoce
  // gifted-charts-core (dependencia de react-native-gifted-charts que se publica sin transpilar).
  transformIgnorePatterns: [
    '/node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|gifted-charts-core)',
    '/node_modules/react-native-reanimated/plugin/',
  ],
};
