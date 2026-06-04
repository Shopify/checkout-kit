package com.shopify.checkoutkit

import android.util.Log
import org.assertj.core.api.Assertions.assertThat
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.shadows.ShadowLog

@RunWith(RobolectricTestRunner::class)
class LogWrapperTest {
    private lateinit var log: LogWrapper

    @Before
    fun beforeEach() {
        log = LogWrapper()
        ShopifyCheckoutKit.configure {
            it.logLevel = LogLevel.ERROR
        }
    }

    @After
    fun afterEach() {
        ShopifyCheckoutKit.configure {
            it.logLevel = LogLevel.ERROR
        }
    }

    @Test
    fun `should emit debug logs when LogLevel is DEBUG`() {
        ShopifyCheckoutKit.configure {
            it.logLevel = LogLevel.DEBUG
        }

        log.d("TAG", "Debug message")
        assertThat(
            ShadowLog.getLogs().any {
                it.type == Log.DEBUG && it.tag == "checkout_kit" && it.msg == "[checkout_kit:tag] Debug message"
            }
        ).isTrue()
    }

    @Test
    fun `should suppress debug logs when LogLevel is WARN`() {
        ShopifyCheckoutKit.configure {
            it.logLevel = LogLevel.WARN
        }

        log.d("TAG", "Debug message")
        assertThat(
            ShadowLog.getLogs().any {
                it.type == Log.DEBUG && it.tag == "checkout_kit" && it.msg == "[checkout_kit:tag] Debug message"
            }
        ).isFalse()
    }

    @Test
    fun `should suppress debug logs when LogLevel is ERROR`() {
        ShopifyCheckoutKit.configure {
            it.logLevel = LogLevel.WARN
        }

        log.d("TAG", "Debug message")
        assertThat(
            ShadowLog.getLogs().any {
                it.type == Log.DEBUG && it.tag == "checkout_kit" && it.msg == "[checkout_kit:tag] Debug message"
            }
        ).isFalse()
    }

    @Test
    fun `should emit warn logs when LogLevel is DEBUG`() {
        ShopifyCheckoutKit.configure {
            it.logLevel = LogLevel.DEBUG
        }

        log.w("TAG", "Warn message")
        assertThat(
            ShadowLog.getLogs().any {
                it.type == Log.WARN && it.tag == "checkout_kit" && it.msg == "[checkout_kit:tag] Warn message"
            }
        ).isTrue()
    }

    @Test
    fun `should emit warn logs when LogLevel is WARN`() {
        ShopifyCheckoutKit.configure {
            it.logLevel = LogLevel.WARN
        }

        log.w("TAG", "Warn message")
        assertThat(
            ShadowLog.getLogs().any {
                it.type == Log.WARN && it.tag == "checkout_kit" && it.msg == "[checkout_kit:tag] Warn message"
            }
        ).isTrue()
    }

    @Test
    fun `should suppress warn logs when LogLevel is ERROR`() {
        ShopifyCheckoutKit.configure {
            it.logLevel = LogLevel.ERROR
        }

        log.w("TAG", "Warn message")
        assertThat(
            ShadowLog.getLogs().any {
                it.type == Log.WARN && it.tag == "checkout_kit" && it.msg == "[checkout_kit:tag] Warn message"
            }
        ).isFalse()
    }

    @Test
    fun `should emit error logs when LogLevel is DEBUG`() {
        ShopifyCheckoutKit.configure {
            it.logLevel = LogLevel.DEBUG
        }

        log.e("TAG", "Error message")
        assertThat(
            ShadowLog.getLogs().any {
                it.type == Log.ERROR && it.tag == "checkout_kit" && it.msg == "[checkout_kit:tag] Error message"
            }
        ).isTrue()
    }

    @Test
    fun `should emit error logs when LogLevel is WARN`() {
        ShopifyCheckoutKit.configure {
            it.logLevel = LogLevel.WARN
        }

        log.e("TAG", "Error message")
        assertThat(
            ShadowLog.getLogs().any {
                it.type == Log.ERROR && it.tag == "checkout_kit" && it.msg == "[checkout_kit:tag] Error message"
            }
        ).isTrue()
    }

    @Test
    fun `should emit error logs when LogLevel is ERROR`() {
        ShopifyCheckoutKit.configure {
            it.logLevel = LogLevel.ERROR
        }

        log.e("TAG", "Error message")
        assertThat(
            ShadowLog.getLogs().any {
                it.type == Log.ERROR && it.tag == "checkout_kit" && it.msg == "[checkout_kit:tag] Error message"
            }
        ).isTrue()
    }

    @Test
    fun `should normalize log scopes consistently`() {
        ShopifyCheckoutKit.configure {
            it.logLevel = LogLevel.ERROR
        }

        val cases = mapOf(
            "ShopifyCheckoutKit" to "checkout_kit",
            "ShopifyAcceleratedCheckouts" to "accelerated_checkout",
            "CheckoutECP" to "ecp",
            "URLParser" to "url_parser",
            "HTTPRequest" to "http_request",
            "accelerated_checkout" to "accelerated_checkout",
            "Checkout2Kit" to "checkout2_kit",
            "ECP2Checkout" to "ecp2_checkout",
        )

        cases.forEach { (tag, scope) ->
            ShadowLog.clear()

            log.e(tag, "Error message")

            assertThat(
                ShadowLog.getLogs().any {
                    it.type == Log.ERROR &&
                        it.tag == "checkout_kit" &&
                        it.msg == "[checkout_kit:$scope] Error message"
                }
            ).isTrue()
        }
    }
}
