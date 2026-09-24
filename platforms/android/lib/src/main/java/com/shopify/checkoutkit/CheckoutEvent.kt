package com.shopify.checkoutkit

/** The payload delivered when checkout starts. */
public class CheckoutStartEvent public constructor(public val checkout: Checkout)

/** The payload delivered when the buyer-visible checkout state changes. */
public class CheckoutUpdateEvent public constructor(public val checkout: Checkout)

/** The payload delivered when checkout completes. */
public class CheckoutCompleteEvent public constructor(public val checkout: Checkout)

/** The payload delivered when checkout cannot continue. */
public class CheckoutFailureEvent public constructor(public val error: CheckoutException)
