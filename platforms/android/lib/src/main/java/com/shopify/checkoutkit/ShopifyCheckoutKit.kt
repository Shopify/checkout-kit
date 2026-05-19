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
     * {@code ShopifyCheckoutKit.configure { it.colorScheme = ColorScheme.Dark() }}
     *
     * @param setter a function that modifies the configuration object
     * @see Configuration
     */
    @JvmStatic
    public fun configure(setter: ConfigurationUpdater) {
        setter.configure(configuration)
    }

    /**
     * Presents a Shopify checkout within a Dialog
     *
     * @param checkoutUrl The URL of the checkout to be presented, this can be obtained via the Storefront API
     * @param context The context the checkout is being presented from
     * @param configure a Kotlin-first builder for fail/cancel callbacks, browser/system hooks,
     * and an optional communication client
     * @return An instance of [CheckoutKitDialog] if the dialog was successfully created and displayed.
     */
    @JvmStatic
    @JvmSynthetic
    public fun present(
        checkoutUrl: String,
        context: ComponentActivity,
        configure: CheckoutPresentation.() -> Unit,
    ): CheckoutKitDialog? {
        val presentation = CheckoutPresentation().apply(configure)
        return present(
            checkoutUrl = checkoutUrl,
            context = context,
            checkoutListener = presentation.buildListener(),
            communicationClient = presentation.communicationClient,
        )
    }

    /**
     * Presents a Shopify checkout within a Dialog
     *
     * @param checkoutUrl The URL of the checkout to be presented, this can be obtained via the Storefront API
     * @param context The context the checkout is being presented from
     * @param checkoutListener provides callbacks to allow clients to listen for and respond to checkout lifecycle events
     * (failure, cancellation, permission prompts, file chooser).
     * @param communicationClient optional handler for Embedded Checkout Protocol (ECP) messages.
     * Implement [CheckoutCommunicationClient] to intercept arbitrary ECP messages from the checkout
     * web page. Built-in messages ([ec.ready][EmbeddedCheckoutProtocol.METHOD_READY] and
     * [ec.start][CheckoutProtocol.start]) are handled automatically by the SDK.
     * @return An instance of [CheckoutKitDialog] if the dialog was successfully created and displayed.
     */
    @JvmOverloads
    @JvmStatic
    public fun <T : DefaultCheckoutListener> present(
        checkoutUrl: String,
        context: ComponentActivity,
        checkoutListener: T,
        communicationClient: CheckoutCommunicationClient? = null,
    ): CheckoutKitDialog? {
        log.d("ShopifyCheckoutKit", "Present called with checkoutUrl $checkoutUrl.")
        if (context.isDestroyed || context.isFinishing) {
            log.d("ShopifyCheckoutKit", "Context is destroyed or finishing, returning null.")
            return null
        }
        log.d("ShopifyCheckoutKit", "Constructing Dialog")
        val dialog = CheckoutDialog(checkoutUrl, checkoutListener, context, communicationClient)
        context.lifecycle.addObserver(object : DefaultLifecycleObserver {
            override fun onDestroy(owner: LifecycleOwner) {
                log.d("ShopifyCheckoutKit", "Context is being destroyed, dismissing dialog.")
                dialog.dismiss()
                super.onDestroy(owner)
            }
        })

        log.d("ShopifyCheckoutKit", "Starting Dialog.")
        dialog.start(context)
        return CheckoutKitDialog { dialog.dismiss() }
    }
}

/**
 * A checkout sheet dialog. Use the [dismiss] method to dismiss the presented dialog
 */
@FunctionalInterface
public fun interface CheckoutKitDialog {
    /**
     * Dismisses the checkout sheet dialog.
     */
    public fun dismiss()
}
