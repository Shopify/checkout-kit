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
     * Called for supported EC notifications (ec.start, ec.error, ec.complete,
     * ec.*.change) and merchant-overridable delegations such as
     * `ec.window.open_request`. For requests, return a JSON-RPC 2.0 response string;
     * for notifications, return null (no response is sent).
     *
     * @param message JSON-RPC 2.0 encoded message string
     * @return JSON-RPC 2.0 encoded response string, or null to send no response
     */
    public fun process(message: String): String?
}
