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

/**
 * UCP embedded-checkout wire payloads (`ec.*`, `checkout` resource, `ec.error`).
 * Consolidated from checkout-web embed mapper / proposal-style shapes (2026-04-08).
 */

// --- shared.ts (subset used by 2026-04-08 Checkout + EcReadyParams + messages) ---

export type CheckoutStatus =
  | "incomplete"
  | "requires_escalation"
  | "ready_for_complete"
  | "complete_in_progress"
  | "completed"
  | "canceled";

export type TotalType =
  | "items_discount"
  | "subtotal"
  | "discount"
  | "fulfillment"
  | "tax"
  | "fee"
  | "total";

export interface Total {
  readonly type: TotalType;
  readonly display_text?: string;
  readonly amount: number;
}

export interface CheckoutLineItemItem {
  readonly id: string;
  readonly title: string;
  readonly price: number;
  readonly image_url?: string;
  readonly [key: string]: unknown;
}

export interface CheckoutLineItem {
  readonly id: string;
  readonly item: CheckoutLineItemItem;
  readonly quantity: number;
  readonly totals: readonly Total[];
  readonly parent_id?: string;
  readonly [key: string]: unknown;
}

export type MessageContentType = "plain" | "markdown";

export type CheckoutMessageSeverity =
  | "recoverable"
  | "requires_buyer_input"
  | "requires_buyer_review"
  | "unrecoverable";

export interface CheckoutMessageError {
  readonly type: "error";
  readonly code: string;
  readonly path?: string;
  readonly content: string;
  readonly content_type?: MessageContentType;
  readonly severity: CheckoutMessageSeverity;
  readonly [key: string]: unknown;
}

export interface CheckoutMessageWarning {
  readonly type: "warning";
  readonly code: string;
  readonly path?: string;
  readonly content: string;
  readonly content_type?: MessageContentType;
  readonly [key: string]: unknown;
}

export interface CheckoutMessageInfo {
  readonly type: "info";
  readonly path?: string;
  readonly code?: string;
  readonly content: string;
  readonly content_type?: MessageContentType;
  readonly [key: string]: unknown;
}

/** Resource-level messages on checkout (not the same as session `ec.error`). */
export type CheckoutMessage = CheckoutMessageError | CheckoutMessageWarning | CheckoutMessageInfo;

export type CheckoutLinkType =
  | "privacy_policy"
  | "terms_of_service"
  | "refund_policy"
  | "shipping_policy"
  | "faq"
  | (string & {});

export interface CheckoutLink {
  readonly type: CheckoutLinkType;
  readonly url: string;
  readonly title?: string;
  readonly [key: string]: unknown;
}

export interface DiscountAllocation {
  readonly path: string;
  readonly amount: number;
}

export interface AppliedDiscount {
  readonly title: string;
  readonly amount: number;
  readonly code?: string;
  readonly automatic?: boolean;
  readonly method?: "each" | "across";
  readonly priority?: number;
  readonly provisional?: boolean;
  readonly eligibility?: string;
  readonly allocations?: readonly DiscountAllocation[];
}

export interface CheckoutDiscounts {
  readonly codes?: readonly string[];
  readonly applied?: readonly AppliedDiscount[];
}

export type FulfillmentMethodType = "shipping" | "pickup";

export interface FulfillmentOption {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly carrier?: string;
  readonly earliest_fulfillment_time?: string;
  readonly latest_fulfillment_time?: string;
  readonly totals: readonly Total[];
  readonly [key: string]: unknown;
}

export interface FulfillmentGroup {
  readonly id: string;
  readonly line_item_ids: readonly string[];
  readonly options?: readonly FulfillmentOption[];
  readonly selected_option_id?: string;
  readonly [key: string]: unknown;
}

export interface FulfillmentAvailableMethod {
  readonly type: FulfillmentMethodType;
  readonly line_item_ids: readonly string[];
  readonly fulfillable_on: string | null;
  readonly description?: string;
  readonly [key: string]: unknown;
}

/** `ec.ready` request params (handshake). */
export interface EcReadyParams {
  readonly delegate: readonly string[];
  readonly [key: string]: unknown;
}

/** Populated on completed checkout (`checkout.order`). */
export interface OrderConfirmation {
  readonly id: string;
  readonly permalink_url: string;
  readonly [key: string]: unknown;
}

// --- embed.ts (UcpPaymentRedemption only — rest is from mapper files) ---

export interface UcpPaymentRedemption {
  readonly source: string;
  readonly amount: number;
  readonly [key: string]: unknown;
}

// --- proposal/types.ts (minimal payment + address for Payment + destinations) ---

export interface UcpPostalAddress {
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

export interface UcpPaymentInstrumentDisplay {
  readonly brand?: string;
  readonly last_digits?: string;
  readonly description?: string;
  readonly card_art?: string;
  readonly [key: string]: unknown;
}

export type PaymentInstrument = UcpPaymentInstrument;

export interface UcpPaymentInstrument {
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

// --- shared.ts: UcpMetadata base + service/capability (for checkout.ucp) ---

export interface UcpPaymentHandler {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly spec?: string;
  readonly schema?: string;
  readonly config?: Readonly<Record<string, unknown>>;
  readonly [key: string]: unknown;
}

export interface UcpService {
  readonly version: string;
  readonly transport: "embedded";
  readonly schema?: string;
  readonly endpoint?: string;
  readonly config?: Readonly<Record<string, unknown>>;
  readonly [key: string]: unknown;
}

export interface UcpCapability {
  readonly version: string;
  readonly extends?: string | readonly string[];
  readonly spec?: string;
  readonly schema?: string;
  readonly config?: Readonly<Record<string, unknown>>;
  readonly [key: string]: unknown;
}

/** Base metadata (2026-01-23 legacy + 2026-04-08 services). */
export interface UcpMetadataBase {
  readonly version: string;
  readonly transports?: {
    readonly embedded: {
      readonly schema: string;
      readonly delegations: readonly string[];
    };
  };
  readonly services?: Readonly<Record<string, readonly UcpService[]>>;
  readonly payment_handlers?: Readonly<Record<string, readonly UcpPaymentHandler[]>>;
  readonly [key: string]: unknown;
}

/** 2026-04-08: adds required `capabilities` registry. */
export interface UcpMetadata extends UcpMetadataBase {
  readonly capabilities: Readonly<Record<string, readonly UcpCapability[]>>;
}

// --- 2026-04-08.ts (Checkout, ShopCash, UcpErrorResponse) ---

export interface Buyer {
  readonly email?: string;
  readonly phone_number?: string;
  readonly first_name?: string;
  readonly last_name?: string;
  readonly [key: string]: unknown;
}

export interface Payment {
  readonly instruments?: readonly PaymentInstrument[];
  readonly [key: string]: unknown;
}

export interface ShippingDestination extends UcpPostalAddress {
  readonly id: string;
}

export interface RetailLocation {
  readonly id: string;
  readonly name: string;
  readonly address?: UcpPostalAddress;
  readonly [key: string]: unknown;
}

export type FulfillmentDestination = ShippingDestination | RetailLocation;

export interface FulfillmentMethod {
  readonly id: string;
  readonly type: FulfillmentMethodType;
  readonly line_item_ids: readonly string[];
  readonly selected_destination_id?: string;
  readonly destinations?: readonly FulfillmentDestination[];
  readonly groups?: readonly FulfillmentGroup[];
  readonly [key: string]: unknown;
}

export interface Fulfillment {
  readonly methods: readonly FulfillmentMethod[];
  readonly available_methods?: readonly FulfillmentAvailableMethod[];
  readonly [key: string]: unknown;
}

/** Wire `checkout` object in `ec.*` notifications carrying full resource. */
export interface Checkout {
  readonly ucp: UcpMetadata;
  readonly id: string;
  readonly currency: string;
  readonly line_items: readonly CheckoutLineItem[];
  readonly totals: readonly Total[];
  readonly buyer?: Buyer;
  readonly payment?: Payment;
  readonly status: CheckoutStatus;
  readonly messages?: readonly CheckoutMessage[];
  readonly links: readonly CheckoutLink[];
  readonly continue_url?: string;
  readonly expires_at?: string;
  readonly fulfillment?: Fulfillment;
  readonly order?: OrderConfirmation;
  readonly redemptions?: readonly UcpPaymentRedemption[];
  readonly discounts?: CheckoutDiscounts;
  readonly [key: string]: unknown;
}

export interface ShopCash {
  readonly balance: {
    readonly status: "unavailable" | "pending" | "filled";
    readonly available_balance?: number;
  };
  readonly expected_earnings?: number;
}

export interface UcpEnvelope {
  readonly version: string;
  readonly status: "success" | "error";
  readonly [key: string]: unknown;
}

export type UcpSuccessEnvelope = UcpEnvelope & { readonly status: "success" };
export type UcpErrorEnvelope = UcpEnvelope & { readonly status: "error" };

/** Session-level fatal `ec.error` params / delegation error branch. */
export interface UcpErrorResponse {
  readonly ucp: UcpErrorEnvelope;
  readonly messages: readonly CheckoutMessageError[];
  readonly continue_url?: string;
  readonly [key: string]: unknown;
}
