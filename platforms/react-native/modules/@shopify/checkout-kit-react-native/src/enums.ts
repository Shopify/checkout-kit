export enum ColorScheme {
  automatic = 'automatic',
  light = 'light',
  dark = 'dark',
  web = 'web_default',
}

/**
 * Log level for Checkout Kit.
 *
 * Controls the verbosity of logs emitted by the native SDK. Levels are an
 * ordered threshold from most to least verbose: selecting a level emits that
 * level and every more-severe level.
 * @defaults to warn
 */
export enum LogLevel {
  /**
   * Show debug, warning, and error logs.
   */
  debug = 'debug',
  /**
   * Show warning and error logs.
   */
  warn = 'warn',
  /**
   * Show only error logs.
   */
  error = 'error',
  /**
   * Silence all logs.
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
