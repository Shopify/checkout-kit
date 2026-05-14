/*
 * MIT License
 *
 * Copyright 2023-present, Shopify Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
package com.shopify.checkoutkit

import android.webkit.JavascriptInterface
import com.shopify.checkoutkit.CheckoutBridge.CheckoutWebOperation.COMPLETED
import com.shopify.checkoutkit.CheckoutBridge.CheckoutWebOperation.ERROR
import com.shopify.checkoutkit.CheckoutBridge.CheckoutWebOperation.MODAL
import com.shopify.checkoutkit.ShopifyCheckoutKit.log
import com.shopify.checkoutkit.errorevents.CheckoutErrorDecoder
import com.shopify.checkoutkit.lifecycleevents.CheckoutCompletedEventDecoder
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

internal class CheckoutBridge(
    private var eventProcessor: CheckoutWebViewEventProcessor,
    private val decoder: Json = Json { ignoreUnknownKeys = true },
    private val checkoutCompletedEventDecoder: CheckoutCompletedEventDecoder = CheckoutCompletedEventDecoder(
        decoder,
        log
    ),
    private val checkoutErrorDecoder: CheckoutErrorDecoder = CheckoutErrorDecoder(decoder, log),
) {

    fun setEventProcessor(eventProcessor: CheckoutWebViewEventProcessor) {
        this.eventProcessor = eventProcessor
    }

    fun getEventProcessor(): CheckoutWebViewEventProcessor = this.eventProcessor

    enum class CheckoutWebOperation(val key: String) {
        COMPLETED("completed"),
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
                COMPLETED -> {
                    log.d(LOG_TAG, "Received Completed message.  Attempting to decode.")
                    checkoutCompletedEventDecoder.decode(decodedMsg).let { event ->
                        log.d(LOG_TAG, "Decoded message $event.")
                        onMainThread {
                            eventProcessor.onCheckoutViewComplete(event)
                        }
                    }
                }

                MODAL -> {
                    log.d(LOG_TAG, "Received Modal message.")
                    val modalVisible = decodedMsg.body.toBooleanStrictOrNull()
                    modalVisible?.let {
                        log.d(LOG_TAG, "Modal visible $it")
                        onMainThread {
                            eventProcessor.onCheckoutViewModalToggled(modalVisible)
                        }
                    }
                }

                ERROR -> {
                    log.d(LOG_TAG, "Received Error message. Attempting to decode.")
                    checkoutErrorDecoder.decode(decodedMsg)?.let { exception ->
                        log.d(LOG_TAG, "Decoded message $exception.")
                        onMainThread {
                            eventProcessor.onCheckoutViewFailedWithError(exception)
                        }
                    }
                }

                else -> {}
            }
        } catch (e: Exception) {
            log.d(LOG_TAG, "Failed to decode message with error: $e. Calling onCheckoutFailedWithError")
            onMainThread {
                eventProcessor.onCheckoutViewFailedWithError(
                    CheckoutKitException(
                        errorDescription = "Error decoding message from checkout.",
                        errorCode = CheckoutKitException.ERROR_RECEIVING_MESSAGE_FROM_CHECKOUT,
                        isRecoverable = true,
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
