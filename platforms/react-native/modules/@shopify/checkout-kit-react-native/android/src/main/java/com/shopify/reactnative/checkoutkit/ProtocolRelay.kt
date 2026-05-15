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
package com.shopify.reactnative.checkoutkit

import com.shopify.checkoutkit.CheckoutProtocol

fun interface DispatchCallback {
    fun invoke(json: String)
}

object ProtocolRelay {

    @JvmStatic
    fun makeClient(
        subscribedMethods: List<String>,
        dispatch: DispatchCallback,
    ): CheckoutProtocol.Client {
        var client = CheckoutProtocol.Client()
        for (method in subscribedMethods) {
            when (method) {
                CheckoutProtocol.start.method -> {
                    client = client.on(CheckoutProtocol.start) { checkout ->
                        forwardEnvelope(method, checkout, dispatch)
                    }
                }
            }
        }
        return client
    }

    private inline fun <reified P> forwardEnvelope(
        type: String,
        payload: P,
        dispatch: DispatchCallback,
    ) {
        try {
            dispatch.invoke(CasingTransform.encodeForJS(DispatchEnvelope(type, payload)))
        } catch (e: Throwable) {
            // dispatch failures are swallowed — there is no native consumer for them
        }
    }
}
