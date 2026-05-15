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

import androidx.activity.ComponentActivity
import com.shopify.checkoutkit.lifecycleevents.CheckoutCompletedEvent
import org.assertj.core.api.Assertions.assertThat
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.shadows.ShadowActivity

@RunWith(RobolectricTestRunner::class)
class DefaultCheckoutEventProcessorTest {

    private lateinit var activity: ComponentActivity
    private lateinit var shadowActivity: ShadowActivity

    @Before
    fun setUp() {
        activity = Robolectric.buildActivity(ComponentActivity::class.java).get()
        shadowActivity = shadowOf(activity)
    }

    @Test
    fun `onCheckoutFailed returns an error description`() {
        var description = ""
        var recoverable: Boolean? = null
        val processor =
            object : DefaultCheckoutEventProcessor() {
                override fun onCheckoutCompleted(checkoutCompletedEvent: CheckoutCompletedEvent) {
                    /* not implemented */
                }

                override fun onCheckoutFailed(error: CheckoutException) {
                    description = error.errorDescription
                    recoverable = error.isRecoverable
                }

                override fun onCheckoutCanceled() {
                    /* not implemented */
                }
            }

        val error = object : CheckoutUnavailableException("error description", "unknown", true) {}

        processor.onCheckoutFailed(error)

        assertThat(description).isEqualTo("error description")
        assertThat(recoverable).isTrue()
    }
}
