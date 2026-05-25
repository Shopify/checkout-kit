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

import type {Checkout, ErrorResponse} from './generated/Models';

export const CHECKOUT_PROTOCOL_VERSION = '2026-04-08' as const;

export const EMBEDDED_CHECKOUT_PUBLIC_NOTIFICATION_METHODS = [
  'ec.start',
  'ec.complete',
  'ec.error',
  'ec.line_items.change',
  'ec.totals.change',
  'ec.messages.change',
] as const;

export const EMBEDDED_CHECKOUT_INTERNAL_NOTIFICATION_METHODS = [
  'ec.buyer.change',
] as const;

export const EMBEDDED_CHECKOUT_DELEGATIONS = ['window.open'] as const;

export const EMBEDDED_CHECKOUT_DELEGATION_METHODS = [
  'ec.window.open_request',
] as const;

export type EmbeddedCheckoutPublicNotificationMethod =
  (typeof EMBEDDED_CHECKOUT_PUBLIC_NOTIFICATION_METHODS)[number];

export type EmbeddedCheckoutInternalNotificationMethod =
  (typeof EMBEDDED_CHECKOUT_INTERNAL_NOTIFICATION_METHODS)[number];

export type EmbeddedCheckoutNotificationMethod =
  | EmbeddedCheckoutPublicNotificationMethod
  | EmbeddedCheckoutInternalNotificationMethod;

export type EmbeddedCheckoutDelegation =
  (typeof EMBEDDED_CHECKOUT_DELEGATIONS)[number];

export type EmbeddedCheckoutDelegationMethod =
  (typeof EMBEDDED_CHECKOUT_DELEGATION_METHODS)[number];

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
