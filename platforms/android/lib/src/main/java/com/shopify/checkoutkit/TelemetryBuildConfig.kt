package com.shopify.checkoutkit

/**
 * Build-time inclusion of Checkout Kit diagnostics in an optimized consumer app.
 *
 * Returns true unless the app's R8 rules replace calls to [isIncluded] with false.
 * Unlike [Telemetry.enabled], this hook allows R8 to remove the telemetry implementation.
 * A build that excludes telemetry cannot enable it through runtime configuration.
 */
public object TelemetryBuildConfig {
    /**
     * R8 configuration hook. Add this to the consuming app's ProGuard rules to exclude telemetry:
     *
     * ```proguard
     * -assumevalues class com.shopify.checkoutkit.TelemetryBuildConfig {
     *     public static boolean isIncluded() return false;
     * }
     * ```
     *
     * Requires an app build with R8 shrinking and optimization enabled.
     */
    @JvmStatic
    @Suppress("FunctionOnlyReturningConstant") // A const val would be inlined before the consumer runs R8.
    public fun isIncluded(): Boolean = true
}
