# The same opt-out documented for consuming apps.
-assumevalues class com.shopify.checkoutkit.TelemetryBuildConfig {
    public static boolean isIncluded() return false;
}

# Test assertions: fail the R8 build if recording/export implementation survives.
-checkdiscard class com.shopify.checkoutkit.telemetry.** { *; }
-checkdiscard class com.shopify.checkoutkit.DefaultCheckoutTelemetryRecorder { *; }
