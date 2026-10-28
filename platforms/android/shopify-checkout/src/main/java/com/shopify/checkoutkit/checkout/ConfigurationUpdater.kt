package com.shopify.checkoutkit.checkout

/**
 * Interface used to update the SDK configuration.
 */
public fun interface ConfigurationUpdater {
    /**
     * Configuration block that the SDK will run to update the SDK settings.
     * @param configuration a copy of the current settings. Modify it (via setters) before this function
     * returns; the SDK then applies it. Do not keep a reference to it.
     */
    public fun configure(configuration: Configuration)
}
