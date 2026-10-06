package com.shopify.test.telemetry

import android.view.View
import android.view.ViewGroup
import android.webkit.WebView
import androidx.appcompat.app.AppCompatActivity
import com.shopify.checkoutkit.CheckoutAppearance
import com.shopify.checkoutkit.CheckoutFailureEvent
import com.shopify.checkoutkit.ColorScheme
import com.shopify.checkoutkit.DefaultCheckoutListener
import com.shopify.checkoutkit.ShopifyCheckout
import com.shopify.checkoutkit.ShopifyCheckoutKit
import com.shopify.checkoutkit.Telemetry
import com.shopify.checkoutkit.TelemetryBuildConfig
import kotlinx.serialization.json.Json

class SmokeActivity : AppCompatActivity() {
    private var checkout: ShopifyCheckout? = null
    private var webView: WebView? = null

    fun telemetryIncluded(): Boolean = TelemetryBuildConfig.isIncluded()

    fun startCheckout() {
        // Keep both runtime branches reachable to R8. Instrumentation enables
        // runtime telemetry in the excluded variant to exercise its precedence.
        ShopifyCheckoutKit.configure {
            it.telemetry = Telemetry(intent.getBooleanExtra("telemetry", false))
        }
        val appearance: CheckoutAppearance = CheckoutAppearance.App(ColorScheme.Dark())
        val json = Json.encodeToString(CheckoutAppearance.serializer(), appearance)
        check(Json.decodeFromString(CheckoutAppearance.serializer(), json) == appearance)

        // Exercise the custom view constructor normally reached through XML.
        layoutInflater.inflate(com.shopify.checkoutkit.R.layout.checkout_sheet_content, null)

        val view = ShopifyCheckout(this, "https://checkout.example/checkouts/r8", object : DefaultCheckoutListener() {
            override fun onCheckoutFailed(event: CheckoutFailureEvent) = Unit
            override fun onCheckoutDismissed() = Unit
        })
        checkout = view
        setContentView(view)
        val browser = requireNotNull(findWebView(view))
        webView = browser
        browser.post {
            browser.stopLoading()
            browser.loadDataWithBaseURL("https://checkout.example/", """
                <html><head><title>waiting</title></head><body><script>
                window.EmbeddedCheckoutProtocol = {postMessage: function(response) {
                    document.title = response.result && response.result.ucp.status === 'success' ? 'ready' : 'error';
                }};
                EmbeddedCheckoutProtocolConsumer.postMessage(JSON.stringify({
                    jsonrpc:'2.0', id:'r8', method:'ec.ready', params:{delegate:[]}
                }));
                </script></body></html>
            """.trimIndent(), "text/html", "UTF-8", null)
        }
    }

    fun protocolReady(): Boolean = webView?.title == "ready"

    private fun findWebView(view: View): WebView? {
        if (view is WebView) return view
        if (view is ViewGroup) {
            for (index in 0 until view.childCount) {
                findWebView(view.getChildAt(index))?.let { return it }
            }
        }
        return null
    }

    override fun onDestroy() {
        checkout?.destroy()
        super.onDestroy()
    }
}
