package com.shopify.checkoutkit.checkout
import androidx.activity.ComponentActivity
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import com.shopify.checkoutkit.internal.logging.LogWrapper
import com.shopify.checkoutkit.internal.presentation.CheckoutBottomSheet
import com.shopify.checkoutkit.internal.protocol.CheckoutProtocol
import com.shopify.checkoutkit.internal.telemetry.CheckoutTelemetry
import com.shopify.checkoutkit.internal.web.CheckoutWebView
import com.shopify.checkoutkit.internal.web.WebMessageListenerTransport
import com.shopify.checkoutkit.internal.web.WebMessageTransport
import com.shopify.checkoutkit.internal.web.redactedUrlForLogging

/**
 * Shared implementation and state for the checkout feature.
 */
internal object CheckoutService {

    private val configurationLock = Any()

    /**
     * The applied configuration. [configure] replaces it with a new instance and never passes it to
     * callers, so readers on any thread see a complete configuration.
     */
    @Volatile
    internal var configuration = Configuration()
        private set

    internal val log = LogWrapper()

    /**
     * A presentation currently tracked as on screen, so repeat [present] calls can be refused.
     */
    private class LivePresentation(
        private val sheet: CheckoutBottomSheet,
        val handle: CheckoutHandle,
    ) {
        fun isShowing(): Boolean = sheet.isShowing

        fun tracks(other: CheckoutBottomSheet): Boolean = sheet === other
    }

    private val livePresentations = mutableMapOf<ComponentActivity, LivePresentation>()

    /** Returns a snapshot so callers cannot bypass the side effects applied by [configure]. */
    internal fun configurationSnapshot(): Configuration {
        return configuration.snapshot()
    }

    /**
     * Runs [setter] on a copy and applies the result only if it returns, then applies configuration
     * side effects and discards reusable preload work. If [setter] throws, nothing changes.
     */
    internal fun configure(setter: ConfigurationUpdater) {
        synchronized(configurationLock) {
            val previous = configuration
            val draft = previous.snapshot()
            setter.configure(draft)
            // Store a fresh copy, so a reference that the setter keeps cannot change the applied configuration.
            val updated = draft.snapshot()
            configuration = updated

            // Keep side effects ordered with their configuration update. In particular, an earlier
            // telemetry opt-out must not shut down a recorder after a later update enables telemetry.
            if (previous.telemetry.enabled && !updated.telemetry.enabled) {
                CheckoutTelemetry.disable()
            }
            CheckoutWebView.clearCache()
        }
    }

    /** Delegates eviction to [CheckoutWebView], which preserves any active buyer session. */
    internal fun clearPreload() {
        log.d("ShopifyCheckout", "Clear preload called.")
        CheckoutWebView.invalidate()
    }

    /** Preloads with the production WebView message transport. */
    internal fun preload(
        checkoutUrl: String,
        context: ComponentActivity,
        listener: PreloadStateListener? = null,
    ): CheckoutPreload? = preload(checkoutUrl, context, WebMessageListenerTransport, listener)

    /**
     * Preload entry point that allows [webMessageTransport] to be injected.
     *
     * Tests supply a deterministic transport so they do not depend on the installed WebView provider.
     */
    internal fun preload(
        checkoutUrl: String,
        context: ComponentActivity,
        webMessageTransport: WebMessageTransport,
        listener: PreloadStateListener? = null,
    ): CheckoutPreload? {
        log.d("ShopifyCheckout", "Preload called with checkoutUrl ${checkoutUrl.redactedUrlForLogging()}.")

        val skipReason = when {
            !configuration.preloading.enabled -> "Preloading disabled, ignoring preload."
            context.isDestroyed || context.isFinishing -> "Context is destroyed or finishing, ignoring preload."
            else -> null
        }
        if (skipReason != null) {
            log.d("ShopifyCheckout", skipReason)
            return null
        }

        return CheckoutWebView.preload(checkoutUrl, context, webMessageTransport, listener)
    }

    /** Builds callbacks from [configure], then presents with the production transport. */
    internal fun present(
        checkoutUrl: String,
        context: ComponentActivity,
        configure: CheckoutPresentation.() -> Unit,
    ): CheckoutHandle? {
        val presentation = CheckoutPresentation().apply(configure)
        return present(
            checkoutUrl = checkoutUrl,
            context = context,
            checkoutListener = presentation.buildListener(),
        )
    }

    /** Builds callbacks from [configure], then presents with the injected [webMessageTransport]. */
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
            webMessageTransport = webMessageTransport,
        )
    }

    /** Presents with the production WebView message transport. */
    internal fun <T : DefaultCheckoutListener> present(
        checkoutUrl: String,
        context: ComponentActivity,
        checkoutListener: T,
    ): CheckoutHandle? {
        return present(
            checkoutUrl = checkoutUrl,
            context = context,
            checkoutListener = checkoutListener,
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
        log.d("ShopifyCheckout", "Present called with checkoutUrl ${checkoutUrl.redactedUrlForLogging()}.")
        if (context.isDestroyed || context.isFinishing) {
            log.d("ShopifyCheckout", "Context is destroyed or finishing, returning null.")
            return null
        }

        val alreadyPresented = livePresentations[context]?.takeIf { it.isShowing() }
        if (alreadyPresented != null) {
            log.w("ShopifyCheckout", "A checkout is already presented, ignoring this presentation.")
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
        log.d("ShopifyCheckout", "Constructing bottom sheet")
        val checkout = CheckoutBottomSheet(
            checkoutUrl = checkoutUrl,
            checkoutListener = checkoutListener,
            activity = context,
            protocolClient = protocolClient,
            webMessageTransport = webMessageTransport,
        )
        val lifecycleObserver = object : DefaultLifecycleObserver {
            override fun onDestroy(owner: LifecycleOwner) {
                log.d("ShopifyCheckout", "Context is being destroyed, dismissing bottom sheet.")
                checkout.dismiss(animate = false)
                super.onDestroy(owner)
            }
        }
        context.lifecycle.addObserver(lifecycleObserver)

        log.d("ShopifyCheckout", "Starting bottom sheet.")
        val checkoutStarted = checkout.start()
        if (!checkoutStarted) {
            context.lifecycle.removeObserver(lifecycleObserver)
            return null
        }

        val handle = CheckoutHandle { checkout.dismiss() }
        livePresentations[context] = LivePresentation(sheet = checkout, handle = handle)
        checkout.onDismissFinalized = {
            context.lifecycle.removeObserver(lifecycleObserver)
            if (livePresentations[context]?.tracks(checkout) == true) {
                livePresentations.remove(context)
            }
        }
        return handle
    }
}
