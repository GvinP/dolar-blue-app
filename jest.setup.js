/* eslint-env jest */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Evita usar los componentes nativos de react-native-screens bajo test.
require('react-native-screens').enableScreens(false);
