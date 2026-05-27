export enum ColorScheme {
  automatic = 'automatic',
  light = 'light',
  dark = 'dark',
  web = 'web_default',
}

/**
 * Log level for Checkout Kit.
 * Controls the verbosity of logs emitted by the native SDK.
 * @defaults to error
 */
export enum LogLevel {
  /**
   * Show debug logs.
   */
  debug = 'debug',
  /**
   * Show only error logs.
   */
  error = 'error',
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
