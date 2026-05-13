/*
MIT License

Copyright 2023 - Present, Shopify Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

// This component should follow the custom element conventions set out here:
// https://github.com/Shopify/ui-api-design/tree/main/codex. In particular,
// take note of the following:
//
// - Follow the web platform's convention for naming wherever possible
//   (e.g.: casing of attriute, property, and event names)
// - Follow the web platform's conventions on reflecting attributes to properties,
//   and on the default values of properties
// - Follow the web platform's convention for preferring properties on an
//   element over properties on events
// - For events that require more complex handling, follow patterns established
//   in more modern web APIs, like `FetchEvent.respondWith()` and
//   `ExtendableEvent.waitUntil()`.
// - For imperative methods, try to take inspiration from other element
//   methods, like `HTMLDialogElement.showModal()` and `HTMLDialogElement.close()`

// TODO: how will we use this in storefront-elements repo?

// Documentation-safe types:

export type CheckoutTarget = "auto" | "popup" | "inline" | "_blank";

export type ColorScheme = "light" | "dark" | "auto";

export interface CheckoutAttributes {
  src?: string;
  auth?: string;
  preload?: boolean | string;
  target?: CheckoutTarget | string;
  colorScheme?: ColorScheme;
}

export interface CheckoutMethods {
  /**
   * Opens the checkout in a popup window by default, but can be configured
   * to open in a new tab or named window using the `target` property.
   */
  open?: () => void;

  /**
   * Closes the checkout popup.
   * Can be used after checkout completion or to cancel the checkout process
   */
  close?: () => void;
}

export interface CheckoutProperties {
  /**
   * The URL of the checkout to load. This will typically come from the `cart.checkoutUrl` field in
   * Shopify’s Storefront API, but could also be a cart permalink or other valid checkout URL.
   *
   * This property is automatically reflected to the `src` attribute, so you can use the `src` attribute
   * or this property interchangeably.
   */
  src?: string;

  /**
   * JWT authentication token for third-party embedders
   * Required for third-party embedders, but not for merchants embedding on their own Shopify websites.
   *
   * This property is automatically reflected to the `auth` attribute, so you can use the `auth` attribute
   * or this property interchangeably.
   */
  auth?: string;

  /**
   * Whether to preload critical assets and data.
   * Setting this attribute will cause the checkout to prefetch resources for faster loading
   *
   * This property is automatically reflected to the `preload` attribute, so you can use the `preload` attribute
   * or this property interchangeably.
   */
  preload?: boolean | string;

  /**
   * The mode in which to display the checkout when opened. Defaults to `'auto'`.
   * - `'popup'`: Opens checkout in a popup window
   * - `'inline'`: Embeds checkout in an iframe within the component
   * - `'_blank' | `'auto'`: Opens checkout in a new tab (default)
   * - `string`: Opens checkout in a new named window
   *
   * For more details on window targets, see the [`Window.open()` `target` parameter](https://developer.mozilla.org/en-US/docs/Web/API/Window/open#target)
   *
   * This property is automatically reflected to the `target` attribute, so you can use the `target` attribute
   * or this property interchangeably.
   */
  target?: CheckoutTarget | string;

  /**
   * The color scheme to apply to the checkout interface. Defaults to `'auto'`.
   * - `'auto'`: Uses the user's device system preference (default)
   * - `'dark'`: Forces the dark theme, ignoring the user's device system preference
   * - `'light'`: Forces the light theme, ignoring the user's device system preference
   */
  colorScheme?: ColorScheme;
}

// If I just used the raw Event class types here, the docs would output the entire documentation for `Event`
// on every event type. This is kind of neat, but makes the pages huge, and doesn’t make it clear what fields
// are actually important to the user. To get nice docs output, I instead created "*Docs" types that declare
// what we actually want to show on the docs, and the implementation implements those interfaces in its types.
export interface CheckoutEvents {
  /**
   * Dispatched when checkout has started.
   */
  "checkout:start": CheckoutStartEvent;

  /**
   * Dispatched when the checkout was successfully completed.
   */
  "checkout:complete": CheckoutCompleteEvent;

  /**
   * Dispatched when the checkout overlay is closed, either due to user action or
   * from calling the `close()` method.
   */
  "checkout:close": CheckoutCloseEvent;

  /**
   * Dispatched when an error occurs during the checkout process.
   */
  "checkout:error": CheckoutErrorEvent;

  /**
   * Dispatched when the buyer starts to change their address.
   * Only dispatched for inline target mode.
   * Requires authentication.
   */
  "checkout:addressChangeStart": CheckoutAddressChangeStartEvent;

  /**
   * Dispatched when the buyer starts to change their payment method.
   * Only dispatched for inline target mode.
   * Requires authentication.
   */
  "checkout:paymentMethodChangeStart": CheckoutPaymentMethodChangeStartEvent;

  /**
   * Dispatched when the buyer attempts to complete the checkout (for PAN exchange).
   * Only dispatched for inline target mode.
   * Requires authentication.
   */
  "checkout:submitStart": CheckoutSubmitStartEvent;
}

export interface CheckoutEvent {
  target?: CheckoutElement;
}

export interface CheckoutStartEvent extends CheckoutEvent {
  type: "checkout:start";
}

export interface CheckoutCloseEvent extends CheckoutEvent {
  type: "checkout:close";
}

export interface CheckoutCompleteEvent extends CheckoutEvent {
  type: "checkout:complete";
}

export interface CheckoutErrorEvent extends CheckoutEvent {
  type: "checkout:error";
}

/**
 * Interface for events that support bidirectional communication via respondWith().
 * Follows the pattern established by FetchEvent.respondWith() in the web platform.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent/respondWith
 */
export interface RespondableCheckoutEvent<ResponsePayload> extends CheckoutEvent {
  /**
   * Responds to the checkout event with a response payload.
   * The SDK will automatically wrap the payload in a JSON-RPC 2.0 response envelope
   * and send it back to the checkout iframe.
   *
   * @param response - A promise that resolves to the response payload
   *
   * @example
   * checkout.addEventListener('checkout:addressChangeStart', (event) => {
   *   event.respondWith(
   *     showAddressSelector().then(selectedAddress => ({
   *       delivery: {
   *         addresses: [{
   *           address: selectedAddress
   *         }]
   *       }
   *     }))
   *   );
   * });
   */
  respondWith(response: Promise<ResponsePayload>): void;
}

export interface CheckoutAddressChangeStartEvent extends RespondableCheckoutEvent<CheckoutAddressChangeStartResponsePayload> {
  type: "checkout:addressChangeStart";
}

export interface CheckoutPaymentMethodChangeStartEvent extends RespondableCheckoutEvent<CheckoutPaymentMethodChangeStartResponsePayload> {
  type: "checkout:paymentMethodChangeStart";
}

export interface CheckoutSubmitStartEvent extends RespondableCheckoutEvent<CheckoutSubmitStartResponsePayload> {
  type: "checkout:submitStart";
}

export type TypedEventListener<Event> =
  | ((event: Event) => void)
  | {
      handleEvent(event: Event): void;
    };

export type CheckoutElement = CheckoutMethods & CheckoutProperties & CheckoutEvents;

/* ------------------------------------------------------------
 * Checkout Protocol
 * ------------------------------------------------------------
 */

/**
 * A checkout protocol message as it is communicated via postMessage (JSON-RPC 2.0 format)
 */
export interface CheckoutProtocolMessageData<
  T extends keyof CheckoutProtocolMessageMap = keyof CheckoutProtocolMessageMap,
> {
  jsonrpc: "2.0";
  method: T;
  params?: CheckoutProtocolMessageMap[T];
}

/**
 * Complete mapping of all checkout protocol message types to their payloads
 */
export interface CheckoutProtocolMessageMap {
  "checkout.start": CheckoutStartPayload;
  "checkout.complete": CheckoutCompletePayload;
  "checkout.error": CheckoutErrorPayload;
  "checkout.addressChangeStart": CheckoutAddressChangeStartPayload;
  "checkout.paymentMethodChangeStart": CheckoutPaymentMethodChangeStartPayload;
  "checkout.submitStart": CheckoutSubmitStartPayload;
}

export type {
  Cart,
  CheckoutAddressChangeStartResponsePayload,
  CheckoutPaymentMethodChangeStartResponsePayload,
  CheckoutSubmitStartResponsePayload,
};

// From app/shared/embed/2025-10/types.ts (payloads + Cart support)

interface Money {
  amount: string;
  currencyCode: string;
}

interface CheckoutPolicies {
  termsOfService?: string;
  privacyPolicy?: string;
}

interface MailingAddress {
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  country?: string;
  countryCodeV2?: string;
  zip?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
}

interface CartDeliveryAddress {
  address1?: string;
  address2?: string;
  city?: string;
  company?: string;
  countryCode?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  provinceCode?: string;
  zip?: string;
}

interface CartSelectableAddress {
  address: CartDeliveryAddress;
  oneTimeUse: boolean;
  selected: boolean;
}

interface Customer {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

interface CartBuyerIdentity {
  email?: string;
  phone?: string;
  customer?: Customer;
  countryCode?: string;
}

interface MerchandiseImage {
  url: string;
  altText?: string;
}

interface SelectedOption {
  name: string;
  value: string;
}

interface CartLineMerchandise {
  id: string;
  title: string;
  product: {
    id: string;
    title: string;
  };
  image?: MerchandiseImage;
  selectedOptions: SelectedOption[];
}

interface PricingPercentageValue {
  percentage: number;
}

type DiscountValue = Money | PricingPercentageValue;

type DiscountApplicationTargetType = "LINE_ITEM" | "SHIPPING_LINE";

interface DiscountApplication {
  allocationMethod: "ACROSS" | "EACH";
  targetSelection: "ALL" | "ENTITLED" | "EXPLICIT";
  targetType: "LINE_ITEM" | "SHIPPING_LINE";
  value: DiscountValue;
}

interface CartDiscountAllocation {
  discountedAmount: Money;
  discountApplication: DiscountApplication;
  targetType: DiscountApplicationTargetType;
}

interface CartDiscountCode {
  code: string;
  applicable: boolean;
}

type CartDeliveryMethodType = "SHIPPING" | "PICKUP" | "PICKUP_POINT" | "LOCAL" | "NONE";

type CartDeliveryGroupType = "SUBSCRIPTION" | "ONE_TIME_PURCHASE";

interface CartDeliveryOption {
  code?: string;
  title?: string;
  description?: string;
  handle: string;
  estimatedCost: Money;
  deliveryMethodType: CartDeliveryMethodType;
}

interface CartDeliveryGroup {
  deliveryAddress: MailingAddress;
  deliveryOptions: CartDeliveryOption[];
  selectedDeliveryOption?: CartDeliveryOption;
  groupType: CartDeliveryGroupType;
}

interface CartDelivery {
  addresses: CartSelectableAddress[];
}

interface CartLineCost {
  amountPerQuantity: Money;
  subtotalAmount: Money;
  totalAmount: Money;
}

interface CartLine {
  id: string;
  quantity: number;
  merchandise: CartLineMerchandise;
  cost: CartLineCost;
  discountAllocations: CartDiscountAllocation[];
}

interface CartCost {
  subtotalAmount: Money;
  totalAmount: Money;
}

interface AppliedGiftCard {
  amountUsed: Money;
  balance: Money;
  lastCharacters: string;
  presentmentAmountUsed: Money;
}

interface Cart {
  id: string;
  lines: CartLine[];
  cost: CartCost;
  buyerIdentity: CartBuyerIdentity;
  deliveryGroups: CartDeliveryGroup[];
  discountCodes: CartDiscountCode[];
  appliedGiftCards: AppliedGiftCard[];
  discountAllocations: CartDiscountAllocation[];
  delivery: CartDelivery;
  payment: CartPayment;
}

interface RemoteTokenPaymentCredential {
  type: "remoteToken";
  token: string;
  tokenType: string;
  tokenHandler: string;
}

type PaymentCredential = RemoteTokenPaymentCredential;

type CardBrand =
  | "VISA"
  | "MASTERCARD"
  | "AMERICAN_EXPRESS"
  | "DISCOVER"
  | "DINERS_CLUB"
  | "JCB"
  | "MAESTRO"
  | "UNKNOWN";

interface CreditCardPaymentInstrument {
  externalReferenceId: string;
  cardHolderName?: string;
  lastDigits?: string;
  month?: number;
  year?: number;
  brand?: CardBrand;
  billingAddress?: MailingAddress;
  credentials?: PaymentCredential[];
  handlerId?: string;
  richTextDescription?: string;
  richCardArt?: string;
}

interface CreditCardPaymentMethod {
  type: "creditCard";
  instruments: CreditCardPaymentInstrument[];
}

type CartPaymentMethod = CreditCardPaymentMethod;

interface CartPaymentHandlers {
  id: string;
  name: string;
  config: Record<string, unknown>;
}

interface CartExpressCheckout {
  wallet: string;
}

interface CartPayment {
  methods: CartPaymentMethod[];
  handlers?: CartPaymentHandlers[];
  expressCheckout?: CartExpressCheckout;
}

interface CartUpdate {
  delivery?: {
    addresses?: CartDelivery["addresses"];
  };
  payment?: {
    methods?: CartPayment["methods"];
  };
}

interface OrderConfirmation {
  url?: string;
  order: {
    id: string;
  };
  number?: string;
  isFirstOrder: boolean;
}

interface CheckoutStartPayload {
  locale: string;
  cart: Cart;
  policies?: CheckoutPolicies;
}

interface CheckoutAddressChangeStartPayload {
  addressType: "shipping";
  cart: Cart;
}

interface CheckoutPaymentMethodChangeStartPayload {
  cart: Cart;
}

interface CheckoutSubmitStartPayload {
  cart: Cart;
  sessionId: string;
}

interface CheckoutCompletePayload {
  orderConfirmation: OrderConfirmation;
  cart: Cart;
}

interface CheckoutErrorPayload {
  code: string;
  message: string;
}

// From app/shared/embed.ts

type ResponseErrorCode =
  | "VALIDATION_ERROR"
  | "SHIPPING_UNAVAILABLE"
  | "DISCOUNT_INVALID"
  | "INVENTORY_INSUFFICIENT"
  | "PAYMENT_METHOD_UNSUPPORTED"
  | "GENERAL_ERROR";

interface ResponseError {
  code: ResponseErrorCode;
  message: string;
  fieldTarget?: string;
}

// From app/utilities/proposal/types.ts (subset for response payloads)

interface UcpPostalAddress {
  readonly extended_address?: string;
  readonly street_address?: string;
  readonly address_locality?: string;
  readonly address_region?: string;
  readonly address_country?: string;
  readonly postal_code?: string;
  readonly first_name?: string;
  readonly last_name?: string;
  readonly phone_number?: string;
  readonly [key: string]: unknown;
}

interface UcpPaymentInstrumentDisplay {
  readonly brand?: string;
  readonly last_digits?: string;
  readonly description?: string;
  readonly card_art?: string;
  readonly [key: string]: unknown;
}

interface UcpPaymentInstrument {
  readonly id: string;
  readonly handler_id: string;
  readonly type: string;
  readonly selected?: boolean;
  readonly display?: UcpPaymentInstrumentDisplay;
  readonly cardholder_name?: string;
  readonly expiry_month?: number;
  readonly expiry_year?: number;
  readonly credential?: Readonly<Record<string, unknown>>;
  readonly billing_address?: UcpPostalAddress;
  readonly [key: string]: unknown;
}

interface CheckoutAddressChangeStartResponsePayload {
  cart?: Pick<CartUpdate, "delivery">;
  errors?: ResponseError[];
}

interface CheckoutPaymentMethodChangeStartResponsePayload {
  cart?: Pick<CartUpdate, "payment">;
  ucpPaymentInstrument?: UcpPaymentInstrument;
  errors?: ResponseError[];
}

interface CheckoutSubmitStartResponsePayload {
  cart?: Pick<CartUpdate, "payment">;
  ucpPaymentInstrument?: UcpPaymentInstrument;
  errors?: ResponseError[];
}
