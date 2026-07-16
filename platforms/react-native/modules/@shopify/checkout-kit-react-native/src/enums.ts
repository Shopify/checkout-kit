export enum ColorScheme {
  automatic = 'automatic',
  light = 'light',
  dark = 'dark',
  storefront = 'storefront',
}

/**
 * Log level for Checkout Kit.
 * Controls the verbosity of logs emitted by the native SDK.
 *
 * The levels are an ordered threshold, from most to least verbose. Omit
 * `logLevel` to keep the native SDK default rather than a value chosen here.
 */
export enum LogLevel {
  /**
   * Show debug logs, warnings, and errors.
   */
  debug = 'debug',
  /**
   * Show warnings and errors.
   */
  warn = 'warn',
  /**
   * Show only error logs.
   */
  error = 'error',
  /**
   * Show no logs.
   */
  none = 'none',
}

/**
 * Available wallet types for accelerated checkout
 */
export enum AcceleratedCheckoutWallet {
  shopPay = 'shopPay',
  applePay = 'applePay',
}

export enum ApplePayContactField {
  email = 'email',
  phone = 'phone',
}
