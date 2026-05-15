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
  return Object.values(CheckoutErrorCode).includes(code as CheckoutErrorCode)
    ? (code as CheckoutErrorCode)
    : CheckoutErrorCode.unknown;
}

type BridgeError = {
  __typename: CheckoutNativeErrorType;
  code: CheckoutErrorCode;
  message: string;
  statusCode?: number;
};

export type CheckoutNativeError = BridgeError;

class GenericErrorWithCode {
  message: string;
  code: CheckoutErrorCode;
  name: string;

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
  name: string;

  constructor(exception: CheckoutNativeError) {
    this.code = getCheckoutErrorCode(exception.code);
    this.statusCode = exception.statusCode as number;
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

export function parseCheckoutError(
  exception: CheckoutNativeError,
): CheckoutException {
  switch (exception?.__typename) {
    case CheckoutNativeErrorType.InternalError:
      return new InternalError(exception);
    case CheckoutNativeErrorType.ConfigurationError:
      return new ConfigurationError(exception);
    case CheckoutNativeErrorType.CheckoutClientError:
      return new CheckoutClientError(exception);
    case CheckoutNativeErrorType.CheckoutHTTPError:
      return new CheckoutHTTPError(exception);
    case CheckoutNativeErrorType.CheckoutExpiredError:
      return new CheckoutExpiredError(exception);
    default:
      return new GenericError(exception);
  }
}
