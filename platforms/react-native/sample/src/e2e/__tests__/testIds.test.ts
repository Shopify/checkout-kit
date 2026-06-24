import {E2ETestIds} from '../testIds';

describe('E2ETestIds', () => {
  it('pins selector values consumed by Maestro flows', () => {
    expect(E2ETestIds.appReady).toBe('checkout-kit-sample-ready');
    expect(E2ETestIds.tabs.catalog).toBe('catalog-tab');
    expect(E2ETestIds.tabs.cart).toBe('cart-tab');
    expect(E2ETestIds.cart.checkoutReady).toBe('cart-checkout-ready');
    expect(E2ETestIds.cart.checkoutButton).toBe('checkout-button');
    expect(E2ETestIds.cart.emptyMessage).toBe('cart-empty-message');
  });

  it('pins generated Settings selector values used outside TypeScript', () => {
    expect(E2ETestIds.settings.section('authentication')).toBe(
      'settings-section-authentication',
    );
    expect(E2ETestIds.settings.buyerIdentityOption('customerAccount')).toBe(
      'settings-buyer-identity-option-customer-account',
    );
    expect(E2ETestIds.settings.themeOption('web_default')).toBe(
      'settings-theme-option-web-default',
    );
    expect(E2ETestIds.settings.applePayStyleOption('whiteOutline')).toBe(
      'settings-apple-pay-style-option-white-outline',
    );
    expect(E2ETestIds.settings.checkoutPreloadingSwitch).toBe(
      'settings-checkout-preloading-switch',
    );
  });
});
