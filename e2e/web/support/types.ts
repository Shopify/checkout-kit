export interface ConfigureOptions {
  src?: string;
  target?: string;
}

export interface OrderConfirmation {
  id: string;
  permalink_url: string;
}

export interface CheckoutResource {
  id: string;
  currency?: string;
  status?: string;
  order?: OrderConfirmation;
}

export interface CompleteEventDetail {
  order?: OrderConfirmation;
}

export interface CheckoutErrorMessage {
  type: string;
  code: string;
  content: string;
  severity: string;
}

export interface CheckoutError {
  messages: CheckoutErrorMessage[];
}

export interface CheckoutEventRecord {
  type: string;
  detail: unknown;
}
