const assert = require('node:assert/strict');
const Module = require('node:module');

// Only mock the native runtime. The packed SDK and React load as ordinary
// CommonJS, without Metro, Babel or a TypeScript require hook.
const load = Module._load;
const viewConfigs = new Map();
const nativeModules = [];
Module._load = function (id, ...args) {
  if (id === 'react-native') {
    return {
      TurboModuleRegistry: {
        getEnforcing(name) {
          nativeModules.push(name);
          return {};
        },
      },
    };
  }
  if (id === 'react-native/Libraries/NativeComponent/NativeComponentRegistry') {
    return {
      get(name, getConfig) {
        viewConfigs.set(name, getConfig());
        return name;
      },
    };
  }
  if (id === 'react-native/Libraries/NativeComponent/ViewConfigIgnore') {
    return {ConditionallyIgnoredEventHandlers: events => events};
  }
  return load.call(this, id, ...args);
};

try {
  const sdk = require('@shopify/checkout-kit-react-native');
  assert.equal(typeof sdk.ShopifyCheckout, 'function');
  assert.equal(typeof sdk.AcceleratedCheckoutButtons, 'function');
  assert.deepEqual(nativeModules, ['ShopifyCheckoutKit']);
  const config = viewConfigs.get('RCTAcceleratedCheckoutButtons');
  assert.equal(config.uiViewClassName, 'RCTAcceleratedCheckoutButtons');
  assert.equal(config.validAttributes.checkoutIdentifier, true);
  assert.equal(
    config.directEventTypes.topDispatch.registrationName,
    'onDispatch',
  );
  assert.equal(
    config.bubblingEventTypes.topRenderStateChange.phasedRegistrationNames
      .bubbled,
    'onRenderStateChange',
  );
} finally {
  Module._load = load;
}
