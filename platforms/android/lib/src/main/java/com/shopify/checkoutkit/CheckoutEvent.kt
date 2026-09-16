package com.shopify.checkoutkit

/** The payload delivered when checkout starts. */
public class CheckoutStartEvent internal constructor(public val checkout: Checkout)

/** The payload delivered when the buyer-visible checkout state changes. */
public class CheckoutUpdateEvent internal constructor(public val checkout: Checkout)

/** The payload delivered when checkout completes. */
public class CheckoutCompleteEvent internal constructor(public val checkout: Checkout)

/** The payload delivered when checkout cannot continue. */
public class CheckoutFailureEvent internal constructor(public val error: CheckoutException)
