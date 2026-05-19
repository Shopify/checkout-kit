/*
 MIT License

 Copyright 2023 - Present, Shopify Inc.

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
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
