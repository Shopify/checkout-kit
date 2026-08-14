import {AccessibilityIdentifiers} from '../accessibilityIdentifiers';

describe('AccessibilityIdentifiers', () => {
  it('pins selector values consumed by Maestro flows', () => {
    expect(AccessibilityIdentifiers.appReady).toBe('checkout-kit-sample-ready');
    expect(AccessibilityIdentifiers.tabs.catalog).toBe('catalog-tab');
    expect(AccessibilityIdentifiers.tabs.cart).toBe('cart-tab');
    expect(AccessibilityIdentifiers.cart.checkoutReady).toBe(
      'cart-checkout-ready',
    );
    expect(AccessibilityIdentifiers.cart.checkoutButton).toBe(
      'checkout-button',
    );
    expect(AccessibilityIdentifiers.cart.emptyMessage).toBe(
      'cart-empty-message',
    );
  });

  it('pins generated Settings selector values used outside TypeScript', () => {
    expect(AccessibilityIdentifiers.settings.section('authentication')).toBe(
      'settings-section-authentication',
    );
    expect(
      AccessibilityIdentifiers.settings.buyerIdentityOption('customerAccount'),
    ).toBe('settings-buyer-identity-option-customer-account');
    expect(AccessibilityIdentifiers.settings.themeOption('storefront')).toBe(
      'settings-theme-option-storefront',
    );
    expect(
      AccessibilityIdentifiers.settings.applePayStyleOption('whiteOutline'),
    ).toBe('settings-apple-pay-style-option-white-outline');
    expect(AccessibilityIdentifiers.settings.checkoutPreloadingSwitch).toBe(
      'settings-checkout-preloading-switch',
    );
  });
});
