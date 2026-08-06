package com.shopify.checkoutkit

import androidx.activity.ComponentActivity
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner

/**
 * Entrypoint to the library, allows configuring and presenting Shopify checkouts.
 */
public object ShopifyCheckoutKit {

    internal val configuration = Configuration()

    internal val log = LogWrapper()

    /**
     * The presentation currently tracked as on screen, so repeat [present] calls can be refused.
     */
    private class LivePresentation(
        private val sheet: CheckoutBottomSheet,
        private val activity: ComponentActivity,
        val handle: CheckoutHandle,
    ) {
        fun isShowingFor(context: ComponentActivity): Boolean = activity === context && sheet.isShowing

        fun tracks(other: CheckoutBottomSheet): Boolean = sheet === other
    }

    private var livePresentation: LivePresentation? = null

    /**
     * Returns the current version of ShopifyCheckoutKit.

     * @return the current version
     */
    public const val VERSION: String = BuildConfig.SDK_VERSION

    /**
     * Returns the currently applied ShopifyCheckoutKit configuration.
     * Note: configuration changes should be made through the configure function.
     *
     * @return the currently applied configuration
     * @see ShopifyCheckoutKit.configure(ConfigurationUpdater)
     */
    @JvmStatic
    public fun getConfiguration(): Configuration {
        return configuration.copy()
    }

    /**
     * Allows configuring ShopifyCheckoutKit.
     *
     * Kotlin example:
     * {@code ShopifyCheckoutKit.configure { it.appearance = CheckoutAppearance.App(ColorScheme.Dark()) }}
     *
     * @param setter a function that modifies the configuration object
     * @see Configuration
     */
    @JvmStatic
    public fun configure(setter: ConfigurationUpdater) {
        setter.configure(configuration)
        CheckoutWebView.clearCache()
    }

    /**
     * Invalidates any cached checkout created by [preload].
     *
     * If the preloaded checkout is already being presented, this does not destroy the active
     * buyer session. The WebView will be discarded after it is dismissed or detached.
     */
    @JvmStatic
    public fun invalidate() {
        log.d("ShopifyCheckoutKit", "Invalidate called.")
        CheckoutWebView.invalidate()
    }

    /**
     * Preloads a Shopify checkout in a background WebView as a best-effort performance hint.
     *
     * Preloaded checkouts are reused only when [present] is later called or a [ShopifyCheckout] is
     * created with the same fully parameterized checkout URL. Otherwise the cached checkout is
     * discarded and checkout loads normally.
     *
     * @param checkoutUrl The URL of the checkout to preload, obtained via the Storefront API.
     * @param context The activity used to create the background WebView.
     * @param listener optional listener invoked on the main thread whenever the preload state changes.
     * @return A [CheckoutPreload] handle exposing the current preload state, or `null` if preloading
     * is disabled or the context is unavailable and no preload was started.
     */
    @JvmStatic
    @JvmOverloads
    public fun preload(
        checkoutUrl: String,
        context: ComponentActivity,
        listener: PreloadStateListener? = null,
    ): CheckoutPreload? = preload(checkoutUrl, context, WebMessageListenerTransport, listener)

    /**
     * Internal preload entry point that allows [webMessageTransport] to be injected.
     *
     * Public calls use [WebMessageListenerTransport]; tests can supply a deterministic transport
     * without depending on the installed WebView provider.
     */
    internal fun preload(
        checkoutUrl: String,
        context: ComponentActivity,
        webMessageTransport: WebMessageTransport,
        listener: PreloadStateListener? = null,
    ): CheckoutPreload? {
        log.d("ShopifyCheckoutKit", "Preload called with checkoutUrl ${checkoutUrl.redactedUrlForLogging()}.")

        val skipReason = when {
            !configuration.preloading.enabled -> "Preloading disabled, ignoring preload."
            context.isDestroyed || context.isFinishing -> "Context is destroyed or finishing, ignoring preload."
            else -> null
        }
        if (skipReason != null) {
            log.d("ShopifyCheckoutKit", skipReason)
            return null
        }

        return CheckoutWebView.preload(checkoutUrl, context, webMessageTransport, listener)
    }

    /**
     * Presents a Shopify checkout within a bottom sheet
     *
     * @param checkoutUrl The URL of the checkout to be presented, this can be obtained via the Storefront API
     * @param context The context the checkout is being presented from
     * @param configure a Kotlin-first builder for fail/dismiss callbacks, browser/system hooks,
     * and an optional typed protocol client
     * @return A [CheckoutHandle] if the sheet was successfully created and displayed.
     */
    @JvmStatic
    @JvmSynthetic
    public fun present(
        checkoutUrl: String,
        context: ComponentActivity,
        configure: CheckoutPresentation.() -> Unit,
    ): CheckoutHandle? {
        val presentation = CheckoutPresentation().apply(configure)
        return present(
            checkoutUrl = checkoutUrl,
            context = context,
            checkoutListener = presentation.buildListener(),
            protocolClient = presentation.protocolClient,
        )
    }

    /**
     * Internal Kotlin presentation entry point that allows [webMessageTransport] to be injected.
     *
     * Builds the callbacks and protocol client from [configure], then delegates to the core
     * presentation path.
     */
    internal fun present(
        checkoutUrl: String,
        context: ComponentActivity,
        webMessageTransport: WebMessageTransport,
        configure: CheckoutPresentation.() -> Unit,
    ): CheckoutHandle? {
        val presentation = CheckoutPresentation().apply(configure)
        return present(
            checkoutUrl = checkoutUrl,
            context = context,
            checkoutListener = presentation.buildListener(),
            protocolClient = presentation.protocolClient,
            webMessageTransport = webMessageTransport,
        )
    }

    /**
     * Presents a Shopify checkout within a bottom sheet
     *
     * @param checkoutUrl The URL of the checkout to be presented, this can be obtained via the Storefront API
     * @param context The context the checkout is being presented from
     * @param checkoutListener provides callbacks to allow clients to listen for and respond to checkout lifecycle events
     * (failure, dismissal, permission prompts, file chooser).
     * @param protocolClient optional typed handler for supported Embedded Checkout Protocol (ECP)
     * callbacks from the checkout web page. Built-in messages
     * (`ec.ready` and [ec.start][CheckoutProtocol.start])
     * are handled automatically by the SDK.
     * @return A [CheckoutHandle] if the sheet was successfully created and displayed.
     */
    @JvmOverloads
    @JvmStatic
    public fun <T : DefaultCheckoutListener> present(
        checkoutUrl: String,
        context: ComponentActivity,
        checkoutListener: T,
        protocolClient: CheckoutProtocol.Client? = null,
    ): CheckoutHandle? {
        return present(
            checkoutUrl = checkoutUrl,
            context = context,
            checkoutListener = checkoutListener,
            protocolClient = protocolClient,
            webMessageTransport = WebMessageListenerTransport,
        )
    }

    /**
     * Core presentation path shared by the public entry points and transport-injected tests.
     *
     * Owns activity validation, bottom-sheet creation, lifecycle cleanup, and unsupported-WebView
     * error reporting. [webMessageTransport] is forwarded to the checkout protocol bridge.
     */
    internal fun <T : DefaultCheckoutListener> present(
        checkoutUrl: String,
        context: ComponentActivity,
        checkoutListener: T,
        protocolClient: CheckoutProtocol.Client? = null,
        webMessageTransport: WebMessageTransport,
    ): CheckoutHandle? {
        log.d("ShopifyCheckoutKit", "Present called with checkoutUrl ${checkoutUrl.redactedUrlForLogging()}.")
        if (context.isDestroyed || context.isFinishing) {
            log.d("ShopifyCheckoutKit", "Context is destroyed or finishing, returning null.")
            return null
        }

        val alreadyPresented = livePresentation?.takeIf { it.isShowingFor(context) }
        if (alreadyPresented != null) {
            log.w("ShopifyCheckoutKit", "A checkout is already presented, ignoring this presentation.")
        }
        return alreadyPresented?.handle ?: startPresentation(
            checkoutUrl = checkoutUrl,
            context = context,
            checkoutListener = checkoutListener,
            protocolClient = protocolClient,
            webMessageTransport = webMessageTransport,
        )
    }

    /**
     * Builds, starts, and tracks a new bottom-sheet presentation.
     *
     * Called only once the activity is usable and no checkout is already on screen for it.
     */
    private fun <T : DefaultCheckoutListener> startPresentation(
        checkoutUrl: String,
        context: ComponentActivity,
        checkoutListener: T,
        protocolClient: CheckoutProtocol.Client?,
        webMessageTransport: WebMessageTransport,
    ): CheckoutHandle? {
        log.d("ShopifyCheckoutKit", "Constructing bottom sheet")
        val checkout = CheckoutBottomSheet(
            checkoutUrl = checkoutUrl,
            checkoutListener = checkoutListener,
            activity = context,
            protocolClient = protocolClient,
            webMessageTransport = webMessageTransport,
        )
        val lifecycleObserver = object : DefaultLifecycleObserver {
            override fun onDestroy(owner: LifecycleOwner) {
                log.d("ShopifyCheckoutKit", "Context is being destroyed, dismissing bottom sheet.")
                checkout.dismiss(animate = false)
                super.onDestroy(owner)
            }
        }
        context.lifecycle.addObserver(lifecycleObserver)

        log.d("ShopifyCheckoutKit", "Starting bottom sheet.")
        val checkoutStarted = checkout.start()
        if (!checkoutStarted) {
            context.lifecycle.removeObserver(lifecycleObserver)
            return null
        }

        val handle = CheckoutHandle { checkout.dismiss() }
        livePresentation = LivePresentation(sheet = checkout, activity = context, handle = handle)
        checkout.onDismissFinalized = {
            context.lifecycle.removeObserver(lifecycleObserver)
            if (livePresentation?.tracks(checkout) == true) {
                livePresentation = null
            }
        }
        return handle
    }
}

/**
 * A handle to a presented checkout. Use [dismiss] to dismiss the checkout programmatically.
 */
public fun interface CheckoutHandle {
    /**
     * Dismisses the presented checkout.
     */
    public fun dismiss()
}
