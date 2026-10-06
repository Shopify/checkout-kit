# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# Preserve the existing retention policy outside telemetry. The internal WebView
# and protocol bridge contain build-gated calls that R8 must optimize away.
-keep class !com.shopify.checkoutkit.telemetry.**,
            !com.shopify.checkoutkit.CheckoutTelemetry*,
            !com.shopify.checkoutkit.DefaultCheckoutTelemetryRecorder,
            !com.shopify.checkoutkit.NoOpCheckoutTelemetryRecorder,
            !com.shopify.checkoutkit.TelemetryBuildConfig,
            !com.shopify.checkoutkit.CheckoutWebView,
            !com.shopify.checkoutkit.CheckoutWebView$*,
            !com.shopify.checkoutkit.EmbeddedCheckoutProtocolBridge,
            !com.shopify.checkoutkit.EmbeddedCheckoutProtocolBridge$*,
            com.shopify.checkoutkit.** { *; }
