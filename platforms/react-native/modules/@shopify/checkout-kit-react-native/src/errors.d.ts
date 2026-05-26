export enum CheckoutErrorCode {
  storefrontPasswordRequired = 'storefront_password_required',
  cartExpired = 'cart_expired',
  cartCompleted = 'cart_completed',
  invalidCart = 'invalid_cart',
  clientError = 'client_error',
  httpError = 'http_error',
  sendingBridgeEventError = 'error_sending_message',
  receivingBridgeEventError = 'error_receiving_message',
  renderProcessGone = 'render_process_gone',
  unknown = 'unknown',
}

export enum CheckoutNativeErrorType {
  InternalError = 'InternalError',
  ConfigurationError = 'ConfigurationError',
  CheckoutClientError = 'CheckoutClientError',
  CheckoutHTTPError = 'CheckoutHTTPError',
  CheckoutExpiredError = 'CheckoutExpiredError',
  UnknownError = 'UnknownError',
}

function getCheckoutErrorCode(code: string | undefined): CheckoutErrorCode {
  const codeKey = Object.keys(CheckoutErrorCode).find(
    key => CheckoutErrorCode[key as keyof typeof CheckoutErrorCode] === code,
  );

  return codeKey ? CheckoutErrorCode[codeKey] : CheckoutErrorCode.unknown;
}

type BridgeError = {
  __typename: CheckoutNativeErrorType;
  code: CheckoutErrorCode;
  message: string;
};

export type CheckoutNativeError =
  | BridgeError
  | (BridgeError & {statusCode: number});

class GenericErrorWithCode {
  message: string;
  code: CheckoutErrorCode;

  constructor(exception: CheckoutNativeError) {
    this.code = getCheckoutErrorCode(exception.code);
    this.message = exception.message;
    this.name = this.constructor.name;
  }
}

class GenericNetworkError {
  code: CheckoutErrorCode;
  message: string;
  statusCode: number;

  constructor(exception: CheckoutNativeError) {
    this.code = getCheckoutErrorCode(exception.code);
    this.statusCode = exception.statusCode;
    this.message = exception.message;
    this.name = this.constructor.name;
  }
}

export class ConfigurationError extends GenericErrorWithCode {}
export class CheckoutClientError extends GenericErrorWithCode {}
export class CheckoutExpiredError extends GenericErrorWithCode {}
export class CheckoutHTTPError extends GenericNetworkError {}

export class GenericError {
  code: CheckoutErrorCode;
  message?: string;
  statusCode?: number;
  name: string;

  constructor(exception?: CheckoutNativeError) {
    this.code = getCheckoutErrorCode(exception?.code);
    this.message = exception?.message;
    this.name = this.constructor.name;
    this.statusCode = exception?.statusCode;
  }
}

export class InternalError {
  code: CheckoutErrorCode;
  message: string;

  constructor(exception: CheckoutNativeError) {
    this.code = getCheckoutErrorCode(exception.code);
    this.message = exception.message;
  }
}

export type CheckoutException =
  | CheckoutClientError
  | CheckoutExpiredError
  | CheckoutHTTPError
  | ConfigurationError
  | GenericError
  | InternalError;
