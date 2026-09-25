package com.shopify.checkoutkit

import android.net.Uri

/** A link that checkout asked the host app to open. */
public class CheckoutLink internal constructor(public val url: Uri)

/** The action Checkout Kit should take for a link clicked in checkout. */
public enum class CheckoutLinkAction {
    /** Open the link using Checkout Kit's default system behavior. */
    Open,

    /** The app handled the link itself. */
    Handled,

    /** Do not open the link. */
    Cancel,
}
