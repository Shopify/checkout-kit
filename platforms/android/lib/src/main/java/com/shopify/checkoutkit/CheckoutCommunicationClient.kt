/*
 * MIT License
 *
 * Copyright 2023-present, Shopify Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
package com.shopify.checkoutkit

/**
 * Implement this interface to handle Embedded Checkout Protocol (ECP) messages beyond
 * the built-in methods handled natively by the SDK.
 *
 * Register an implementation via [ShopifyCheckoutKit.present].
 */
public interface CheckoutCommunicationClient {
    /**
     * Process a JSON-RPC 2.0 ECP message from the checkout web page.
     *
     * Called for EC notifications (ec.start, ec.error, ec.complete, ec.*.change) and
     * any unknown methods the kit doesn't handle natively. Delegations such as
     * `ec.window.open_request` are handled internally by the kit and are not forwarded
     * here. For requests, return a JSON-RPC 2.0 response string; for notifications,
     * return null (no response is sent).
     *
     * @param message JSON-RPC 2.0 encoded message string
     * @return JSON-RPC 2.0 encoded response string, or null to send no response
     */
    public fun process(message: String): String?
}
