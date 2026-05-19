package com.shopify.checkoutkit

import android.webkit.JavascriptInterface
import com.shopify.checkoutkit.CheckoutBridge.CheckoutWebOperation.ERROR
import com.shopify.checkoutkit.CheckoutBridge.CheckoutWebOperation.MODAL
import com.shopify.checkoutkit.ShopifyCheckoutKit.log
import com.shopify.checkoutkit.errorevents.CheckoutErrorDecoder
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

internal class CheckoutBridge(
    private var listener: CheckoutWebViewListener,
    private val decoder: Json = Json { ignoreUnknownKeys = true },
    private val checkoutErrorDecoder: CheckoutErrorDecoder = CheckoutErrorDecoder(decoder, log),
) {

    fun setListener(listener: CheckoutWebViewListener) {
        this.listener = listener
    }

    fun getListener(): CheckoutWebViewListener = this.listener

    enum class CheckoutWebOperation(val key: String) {
        MODAL("checkoutBlockingEvent"),
        ERROR("error");

        companion object {
            fun fromKey(key: String): CheckoutWebOperation? {
                return entries.find { it.key == key }
            }
        }
    }

    // Allows Web to postMessages back to the SDK
    @Suppress("SwallowedException")
    @JavascriptInterface
    fun postMessage(message: String) {
        try {
            log.d(LOG_TAG, "Received message from checkout.")
            val decodedMsg = decoder.decodeFromString<WebToSdkEvent>(message)

            when (CheckoutWebOperation.fromKey(decodedMsg.name)) {
                MODAL -> {
                    log.d(LOG_TAG, "Received Modal message.")
                    val modalVisible = decodedMsg.body.toBooleanStrictOrNull()
                    modalVisible?.let {
                        log.d(LOG_TAG, "Modal visible $it")
                        onMainThread {
                            listener.onCheckoutViewModalToggled(modalVisible)
                        }
                    }
                }

                ERROR -> {
                    log.d(LOG_TAG, "Received Error message. Attempting to decode.")
                    checkoutErrorDecoder.decode(decodedMsg)?.let { exception ->
                        log.d(LOG_TAG, "Decoded message $exception.")
                        onMainThread {
                            listener.onCheckoutViewFailedWithError(exception)
                        }
                    }
                }

                else -> {}
            }
        } catch (e: Exception) {
            log.d(LOG_TAG, "Failed to decode message with error: $e. Calling onCheckoutFailedWithError")
            onMainThread {
                listener.onCheckoutViewFailedWithError(
                    CheckoutKitException(
                        errorDescription = "Error decoding message from checkout.",
                        errorCode = CheckoutKitException.ERROR_RECEIVING_MESSAGE_FROM_CHECKOUT,
                    ),
                )
            }
        }
    }

    companion object {
        private const val LOG_TAG = "CheckoutBridge"
    }
}

@Serializable
internal data class WebToSdkEvent(
    val name: String,
    val body: String = ""
)
