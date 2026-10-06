# The separately compiled instrumentation APK calls these fixture methods.
# Keep their names while allowing the app's telemetry gates to be optimized.
-keepclassmembers,allowoptimization class com.shopify.test.telemetry.SmokeActivity {
    public boolean telemetryIncluded();
    public void startCheckout();
    public boolean protocolReady();
}
