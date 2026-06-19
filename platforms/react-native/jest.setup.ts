declare global {
  var __fbBatchedBridgeConfig: unknown;
}

const platformConstants = {
  forceTouchAvailable: false,
  interfaceIdiom: 'phone',
  isTesting: true,
  osVersion: '17.0',
  reactNativeVersion: {major: 0, minor: 83, patch: 9, prerelease: null},
  systemName: 'iOS',
};

const sourceCode = {
  scriptURL: 'file://test.js',
};

const deviceInfo = {
  Dimensions: {
    window: {width: 390, height: 844, scale: 3, fontScale: 1},
    screen: {width: 390, height: 844, scale: 3, fontScale: 1},
  },
  isIPhoneX_deprecated: false,
  isIPhoneXr_deprecated: false,
};

const uiManager = {
  getConstants: () => ({}),
  getConstantsForViewManager: () => ({}),
  getDefaultEventTypes: () => ({}),
  getViewManagerConfig: () => ({
    Constants: {
      checkoutProtocolEventTypes: [
        'ec.complete',
        'ec.error',
        'ec.line_items.change',
        'ec.messages.change',
        'ec.start',
        'ec.totals.change',
      ],
    },
  }),
};

global.__fbBatchedBridgeConfig = {
  remoteModuleConfig: [
    ['PlatformConstants', platformConstants, [], [], []],
    ['SourceCode', sourceCode, [], [], []],
    ['DeviceInfo', deviceInfo, [], [], []],
    ['UIManager', uiManager, [], [], []],
  ],
  localModulesConfig: [],
};

export {};
