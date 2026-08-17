export class AccessibilityIdentifiers {
  private static kebabCase(value: string) {
    return value
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  static readonly appReady = 'checkout-kit-sample-ready';

  static readonly tabs = {
    catalog: 'catalog-tab',
    cart: 'cart-tab',
    account: 'account-tab',
    settings: 'settings-tab',
  } as const;

  static readonly catalog = {
    headerCartIcon: 'header-cart-icon',
    productGridItem: (index: number) => `product-${index}-grid-item`,
  } as const;

  static readonly productDetails = {
    addToCartButton: 'add-to-cart-button',
  } as const;

  static readonly cart = {
    emptyMessage: 'cart-empty-message',
    checkoutReady: 'cart-checkout-ready',
    checkoutButton: 'checkout-button',
    preloadState: 'cart-preload-state',
  } as const;

  static readonly settings = {
    screen: 'settings-screen',
    section: (section: string) =>
      `settings-section-${AccessibilityIdentifiers.kebabCase(section)}`,
    buyerIdentityOption: (mode: string) =>
      `settings-buyer-identity-option-${AccessibilityIdentifiers.kebabCase(mode)}`,
    themeOption: (scheme: string) =>
      `settings-theme-option-${AccessibilityIdentifiers.kebabCase(scheme)}`,
    applePayStyleOption: (style: string) =>
      `settings-apple-pay-style-option-${AccessibilityIdentifiers.kebabCase(style)}`,
    checkoutPreloadingSwitch: 'settings-checkout-preloading-switch',
    buyerIdentityDetails: 'settings-buyer-identity-details',
    buyerIdentitySignInLink: 'settings-buyer-identity-sign-in-link',
    buyerIdentityChangeUserLink: 'settings-buyer-identity-change-user-link',
  } as const;

  static readonly account = {
    screen: 'account-screen',
    loading: 'account-loading',
    signedInView: 'account-signed-in-view',
    signedOutView: 'account-signed-out-view',
    email: 'account-email',
    signInButton: 'account-sign-in-button',
    signOutButton: 'account-sign-out-button',
    loginProcessing: 'account-login-processing',
    loginWebView: 'account-login-webview',
  } as const;
}
