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

        log.d("tag", "Debug message")
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

        log.d("tag", "Debug message")
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

        log.d("tag", "Debug message")
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

        log.w("tag", "Warn message")
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

        log.w("tag", "Warn message")
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

        log.w("tag", "Warn message")
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

        log.e("tag", "Error message")
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

        log.e("tag", "Error message")
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

        log.e("tag", "Error message")
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
            "ShopifyCheckoutKit" to "sdk",
            "checkout_kit" to "sdk",
            "sdk" to "sdk",
            "ShopifyAcceleratedCheckouts" to "accelerated_checkout",
            "CheckoutECP" to "ecp",
            "accelerated_checkout" to "accelerated_checkout",
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
