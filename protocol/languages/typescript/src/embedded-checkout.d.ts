import type { Checkout, ErrorResponse } from './generated/Models';
export declare const CHECKOUT_PROTOCOL_VERSION: "2026-04-08";
export declare const EMBEDDED_CHECKOUT_PUBLIC_NOTIFICATION_METHODS: readonly ["ec.start", "ec.complete", "ec.error", "ec.line_items.change", "ec.totals.change", "ec.messages.change"];
export declare const EMBEDDED_CHECKOUT_INTERNAL_NOTIFICATION_METHODS: readonly ["ec.buyer.change"];
export declare const EMBEDDED_CHECKOUT_DELEGATIONS: readonly ["window.open"];
export declare const EMBEDDED_CHECKOUT_DELEGATION_METHODS: readonly ["ec.window.open_request"];
export type EmbeddedCheckoutPublicNotificationMethod = (typeof EMBEDDED_CHECKOUT_PUBLIC_NOTIFICATION_METHODS)[number];
export type EmbeddedCheckoutInternalNotificationMethod = (typeof EMBEDDED_CHECKOUT_INTERNAL_NOTIFICATION_METHODS)[number];
export type EmbeddedCheckoutNotificationMethod = EmbeddedCheckoutPublicNotificationMethod | EmbeddedCheckoutInternalNotificationMethod;
export type EmbeddedCheckoutDelegation = (typeof EMBEDDED_CHECKOUT_DELEGATIONS)[number];
export type EmbeddedCheckoutDelegationMethod = (typeof EMBEDDED_CHECKOUT_DELEGATION_METHODS)[number];
export interface EmbeddedCheckoutReadyParams {
    delegate?: string[];
}
export interface EmbeddedCheckoutCheckoutParams {
    checkout: Checkout;
}
export interface EmbeddedCheckoutErrorParams {
    error: ErrorResponse;
}
export interface EmbeddedCheckoutWindowOpenParams {
    url: string;
}
