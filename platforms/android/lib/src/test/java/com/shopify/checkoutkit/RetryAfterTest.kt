package com.shopify.checkoutkit

import org.assertj.core.api.Assertions.assertThat
import org.junit.Test

class RetryAfterTest {
    private val nowMillis = 784_111_897_000

    @Test
    fun `parses delay seconds`() {
        assertThat(RetryAfter.seconds(" 120 ", nowMillis)).isEqualTo(120)
    }

    @Test
    fun `parses HTTP date`() {
        assertThat(RetryAfter.seconds("Sun, 06 Nov 1994 08:51:47 GMT", nowMillis)).isEqualTo(10)
    }

    @Test
    fun `past HTTP date returns zero`() {
        assertThat(RetryAfter.seconds("Sun, 06 Nov 1994 08:51:27 GMT", nowMillis)).isZero()
    }

    @Test
    fun `missing or invalid value returns null`() {
        assertThat(RetryAfter.seconds(null, nowMillis)).isNull()
        assertThat(RetryAfter.seconds("invalid", nowMillis)).isNull()
        assertThat(RetryAfter.seconds("-1", nowMillis)).isNull()
    }
}
