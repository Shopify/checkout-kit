package com.shopify.checkoutkit.errors

import com.shopify.checkoutkit.ClientException
import com.shopify.checkoutkit.LogWrapper
import com.shopify.checkoutkit.WebToSdkEvent
import com.shopify.checkoutkit.errorevents.CheckoutErrorDecoder
import com.shopify.checkoutkit.errorevents.CheckoutErrorGroup
import com.shopify.checkoutkit.errorevents.CheckoutErrorPayload
import kotlinx.serialization.json.Json
import org.assertj.core.api.Assertions.assertThat
import org.junit.Assert.assertThrows
import org.junit.Test
import org.mockito.Mockito

class CheckoutErrorDecoderTest {

    private val logWrapper = Mockito.mock<LogWrapper>()
    private val decoder = CheckoutErrorDecoder(Json { ignoreUnknownKeys = true }, logWrapper)

    @Test
    fun `should decode a checkout error`() {
        val event = WebToSdkEvent(
            name = "error",
            body = """[
                |{
                |   "group": "unrecoverable",
                |   "flowType": "regular",
                |   "type": "sdk_not_enabled",
                |   "code": "sdk_not_enabled",
                |   "reason": ""
                |}
            ]
            """.trimMargin()
        )

        val decoded = decoder.decodeMessage(event)

        assertThat(decoded).isEqualTo(
            CheckoutErrorPayload(
                group = CheckoutErrorGroup.UNRECOVERABLE,
                flowType = "regular",
                type = "sdk_not_enabled",
                code = "sdk_not_enabled",
                reason = ""
            )
        )
    }

    @Test
    fun `should return group = unsupported for any groups that arent supported`() {
        val event = WebToSdkEvent(
            name = "error",
            body = """[
                |{
                |   "group": "other",
                |   "flowType": "regular",
                |   "type": "invalid_signature",
                |   "code": "invalid_signature",
                |   "reason": ""
                |}
            ]
            """.trimMargin()
        )

        val decoded = decoder.decodeMessage(event)

        assertThat(decoded).isEqualTo(
            CheckoutErrorPayload(
                group = CheckoutErrorGroup.UNSUPPORTED,
                flowType = "regular",
                type = "invalid_signature",
                code = "invalid_signature",
                reason = ""
            )
        )
    }

    @Test
    fun `should throw if decoding fails`() {
        val event = WebToSdkEvent(
            name = "error",
            body = """[
                |{
                |   "group": "unrecoverable",
                |   "flowType": "regular",
                |   "type": "invalid_
                |}
            ]
            """.trimMargin()
        )

        assertThrows(RuntimeException::class.java) { decoder.decodeMessage(event) }
    }

    @Test
    fun `should decode unrecoverable error as client exception`() {
        val event = WebToSdkEvent(
            name = "error",
            body = """[
                |{
                |   "group": "unrecoverable",
                |   "flowType": "regular",
                |   "type": "sdk_not_enabled",
                |   "code": "sdk_not_enabled",
                |   "reason": "SDK not enabled"
                |}
            ]
            """.trimMargin()
        )

        val decoded = decoder.decode(event)

        assertThat(decoded).isInstanceOf(ClientException::class.java)
        assertThat(decoded!!.errorDescription).isEqualTo("SDK not enabled")
    }

    @Test
    fun `should return first message if multiple exist in payload`() {
        val event = WebToSdkEvent(
            name = "error",
            body = """[
                |{
                |   "group": "unrecoverable",
                |   "flowType": "regular",
                |   "type": "sdk_not_enabled",
                |   "code": "sdk_not_enabled",
                |   "reason": ""
                |},
                |{
                |   "group": "unrecoverable",
                |   "flowType": "regular",
                |   "type": "invalid_checkout_url",
                |   "code": "invalid_checkout_url",
                |   "reason": ""
                |}
            ]
            """.trimMargin()
        )

        val decoded = decoder.decodeMessage(event)

        assertThat(decoded.code).isEqualTo("sdk_not_enabled")
    }
}
