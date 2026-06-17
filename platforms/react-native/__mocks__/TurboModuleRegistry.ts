const ReactNative = require('./react-native');

module.exports = {
  get: ReactNative.TurboModuleRegistry.getEnforcing,
  getEnforcing: ReactNative.TurboModuleRegistry.getEnforcing,
};

export {};
