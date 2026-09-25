import {decodeCheckoutSnapshot} from '@shopify/checkout-kit-protocol';
import type {
  Buyer,
  CheckoutDiscounts,
  CheckoutFulfillment,
  CheckoutStatus,
  CheckoutTotal,
  Context,
  LineItem,
  Link,
  Message,
  OrderConfirmation,
  Payment,
  Policy,
} from '@shopify/checkout-kit-protocol';
import type {CheckoutException} from './errors';

/** A checkout snapshot containing domain data without protocol metadata. */
export interface Checkout {
  actions?: Record<string, Record<string, unknown>[]>;
  attribution?: Record<string, string>;
  buyer?: Buyer;
  context?: Context;
  continueUrl?: string;
  currency: string;
  discounts?: CheckoutDiscounts;
  expiresAt?: string;
  fulfillment?: CheckoutFulfillment;
  id: string;
  lineItems: LineItem[];
  links: Link[];
  messages?: Message[];
  order?: OrderConfirmation;
  payment?: Payment;
  policies?: Policy[];
  signals?: Record<string, unknown>;
  status: CheckoutStatus;
  totals: CheckoutTotal[];
  /** Extension fields retain their original names and values. */
  [key: string]: unknown;
}

export interface CheckoutStartEvent {
  checkout: Checkout;
}
export interface CheckoutUpdateEvent {
  checkout: Checkout;
}
export interface CheckoutCompleteEvent {
  checkout: Checkout;
}
export interface CheckoutFailureEvent {
  error: CheckoutException;
}
export interface CheckoutLink {
  url: string;
}
export type CheckoutLinkAction = 'open' | 'handled' | 'cancel';

/** Lifecycle callbacks shared by checkout sheets and accelerated buttons. */
export interface CheckoutEventHandlers {
  onStart?: (event: CheckoutStartEvent) => void;
  onUpdate?: (event: CheckoutUpdateEvent) => void;
  /** Completion leaves the confirmation UI visible until dismissal. */
  onComplete?: (event: CheckoutCompleteEvent) => void;
  onFail?: (event: CheckoutFailureEvent) => void;
  onDismiss?: () => void;
  /** Notification only; use linkAction to choose the native response. */
  onLinkClick?: (link: CheckoutLink) => void;
  /** Native link policy, chosen before presentation. Defaults to open. */
  linkAction?: CheckoutLinkAction;
}

export function decodeCheckout(value: unknown): Checkout {
  return decodeCheckoutSnapshot(value) as unknown as Checkout;
}
