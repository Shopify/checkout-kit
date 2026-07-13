package com.shopify.checkoutkit

import android.webkit.CookieManager
import java.net.HttpCookie

/**
 * Controls the cookies backing the checkout web view.
 *
 * Android exposes a single, process-wide [CookieManager]; there is no per-web-view
 * cookie store equivalent to iOS's `WKWebsiteDataStore`. These cases therefore act
 * on the shared cookie jar. [Ephemeral] and [Seeded] clear that jar before checkout
 * loads, which affects every web view in the app — use them when the host wants
 * deterministic control of the checkout session (for example, tearing it down on
 * logout), not for true per-view isolation.
 */
public sealed class CheckoutCookieStore {
    /** The default shared cookie jar. Checkout is left untouched. */
    public object Shared : CheckoutCookieStore()

    /** Clears the shared cookie jar before checkout loads, starting from a clean session. */
    public object Ephemeral : CheckoutCookieStore()

    /** Clears the shared cookie jar, then seeds the given cookies before checkout loads. */
    public data class Seeded(public val cookies: List<HttpCookie>) : CheckoutCookieStore()

    internal fun prepare(url: String, cookieManager: CookieManager = CookieManager.getInstance()) {
        when (this) {
            is Shared -> Unit
            is Ephemeral -> {
                cookieManager.removeAllCookies(null)
                cookieManager.flush()
            }
            is Seeded -> {
                cookieManager.removeAllCookies(null)
                cookies.forEach { cookieManager.setCookie(url, it.toSetCookieString()) }
                cookieManager.flush()
            }
        }
    }
}

private fun HttpCookie.toSetCookieString(): String = buildString {
    append("$name=$value")
    domain?.let { append("; Domain=$it") }
    path?.let { append("; Path=$it") }
    if (secure) append("; Secure")
}
