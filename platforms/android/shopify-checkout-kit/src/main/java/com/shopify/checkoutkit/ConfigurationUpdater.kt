package com.shopify.checkoutkit

/**
 * Interface used to update the SDK configuration.
 */
public fun interface ConfigurationUpdater {
    /**
     * Configuration block that the SDK will run to update the SDK settings.
     * @param configuration object that you can modify (via setters) to update the settings.
     */
    public fun configure(configuration: Configuration)
}
