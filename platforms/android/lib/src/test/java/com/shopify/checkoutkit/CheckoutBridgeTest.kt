package com.shopify.checkoutkit

import com.shopify.checkoutkit.CheckoutBridge.CheckoutWebOperation.MODAL
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.assertj.core.api.Assertions.assertThat
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.kotlin.argumentCaptor
import org.mockito.kotlin.mock
import org.mockito.kotlin.timeout
import org.mockito.kotlin.verify
import org.mockito.kotlin.verifyNoInteractions
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class CheckoutBridgeTest {

    private var mockListener = mock<CheckoutWebViewListener>()
    private lateinit var checkoutBridge: CheckoutBridge

    @Before
    fun init() {
        checkoutBridge = CheckoutBridge(mockListener)
    }

    @Test
    fun `postMessage calls web event processor onCheckoutModalToggled when modal message received - false`() {
        checkoutBridge.postMessage(
            Json.encodeToString(
                WebToSdkEvent(
                    MODAL.key,
                    "false"
                )
            )
        )
        verify(mockListener).onCheckoutViewModalToggled(false)
    }

    @Test
    fun `postMessage calls web event processor onCheckoutModalToggled when modal message received - true`() {
        checkoutBridge.postMessage(
            Json.encodeToString(
                WebToSdkEvent(
                    MODAL.key,
                    "true"
                )
            )
        )
        verify(mockListener).onCheckoutViewModalToggled(true)
    }

    @Test
    fun `postMessage does not issue a msg to the event processor when unsupported message received`() {
        checkoutBridge.postMessage(Json.encodeToString(WebToSdkEvent("boom")))
        verifyNoInteractions(mockListener)
    }

    @Test
    fun `should decode a checkout expired error payload and call processor#onCheckoutViewFailedWithError - invalid`() {
        val eventString = """|
            |{
            |   "name":"error",
            |   "body": "[{
            |       \"group\": \"expired\",
            |       \"reason\": \"Cart is invalid\",
            |       \"flowType\": \"regular\",
            |       \"code\": \"invalid_cart\"
            |   }]"
            |}
        |
        """.trimMargin()

        checkoutBridge.postMessage(eventString)

        val captor = argumentCaptor<CheckoutException>()
        verify(mockListener, timeout(2000).times(1)).onCheckoutViewFailedWithError(captor.capture())

        val error = captor.firstValue
        assertThat(error).isInstanceOf(CheckoutExpiredException::class.java)
        assertThat(error.message).isEqualTo("Cart is invalid")
        assertThat(error.errorCode).isEqualTo(CheckoutExpiredException.INVALID_CART)
    }

    @Test
    fun `should decode a checkout expired error payload and call processor#onCheckoutViewFailedWithError - completed`() {
        val eventString = """|
            |{
            |   "name":"error",
            |   "body": "[{
            |       \"group\": \"expired\",
            |       \"reason\": \"Checkout has been completed\",
            |       \"flowType\": \"regular\",
            |       \"code\": \"cart_completed\"
            |   }]"
            |}
        |
        """.trimMargin()

        checkoutBridge.postMessage(eventString)

        val captor = argumentCaptor<CheckoutException>()
        verify(mockListener, timeout(2000).times(1)).onCheckoutViewFailedWithError(captor.capture())

        val error = captor.firstValue
        assertThat(error).isInstanceOf(CheckoutExpiredException::class.java)
        assertThat(error.message).isEqualTo("Checkout has been completed")
        assertThat(error.errorCode).isEqualTo(CheckoutExpiredException.CART_COMPLETED)
    }

    @Test
    fun `should decode a barebones expired error payload and call processor#onCheckoutViewFailedWithError`() {
        val eventString = """|
            |{
            |   "name": "error",
            |   "body": "[{
            |       \"group\": \"expired\"
            |   }]"
            |}
        |
        """.trimMargin()

        checkoutBridge.postMessage(eventString)

        val captor = argumentCaptor<CheckoutException>()
        verify(mockListener, timeout(2000).times(1)).onCheckoutViewFailedWithError(captor.capture())

        val error = captor.firstValue
        assertThat(error).isInstanceOf(CheckoutExpiredException::class.java)
        assertThat(error.message).isEqualTo(
            "Checkout is no longer available with the provided token. Please generate a new checkout URL"
        )
        assertThat(error.errorCode).isEqualTo(CheckoutExpiredException.CART_EXPIRED)
    }

    @Test
    fun `should decode an unrecoverable error payload and call processor#onCheckoutViewFailedWithError`() {
        val eventString = """|
            |{
            |   "name":"error",
            |   "body": "[{
            |       \"group\": \"unrecoverable\",
            |       \"reason\": \"Checkout crashed\",
            |       \"code\": \"sdk_not_enabled\"
            |   }]"
            |}
        |
        """.trimMargin()

        checkoutBridge.postMessage(eventString)

        val captor = argumentCaptor<CheckoutException>()
        verify(mockListener, timeout(2000).times(1)).onCheckoutViewFailedWithError(captor.capture())

        val error = captor.firstValue
        assertThat(error).isInstanceOf(CheckoutUnavailableException::class.java)
        assertThat(error.message).isEqualTo("Checkout crashed")
        assertThat(error.errorCode).isEqualTo(CheckoutUnavailableException.CLIENT_ERROR)
    }

    @Test
    fun `should decode a configuration error payload and call processor#onCheckoutViewFailedWithError - storefront pw required`() {
        val eventString = """|
            |{
            |   "name":"error",
            |   "body": "[{
            |       \"group\": \"configuration\",
            |       \"reason\": \"Storefront password required\",
            |       \"code\": \"storefront_password_required\"
            |   }]"
            |}
        |
        """.trimMargin()

        checkoutBridge.postMessage(eventString)

        val captor = argumentCaptor<CheckoutException>()
        verify(mockListener, timeout(2000).times(1)).onCheckoutViewFailedWithError(captor.capture())

        val error = captor.firstValue
        assertThat(error).isInstanceOf(ConfigurationException::class.java)
        assertThat(error.message).isEqualTo("Storefront password required")
        assertThat(error.errorCode).isEqualTo(ConfigurationException.STOREFRONT_PASSWORD_REQUIRED)
    }

    @Test
    fun `should ignore unsupported error payloads`() {
        val eventString = """|
            |{
            |   "name":"error",
            |   "body": "[{
            |       \"group\": \"authentication\",
            |       \"reason\": \"invalid signature\",
            |       \"code\": \"invalid_signature\"
            |   }]"
            |}
        |
        """.trimMargin()

        checkoutBridge.postMessage(eventString)

        verifyNoInteractions(mockListener)
    }

    @Test
    fun `should call onCheckoutViewFailedWithError if message cannot be decoded`() {
        val eventString = """|
            |{
            |   "name":"error
            |}
        |
        """.trimMargin()

        checkoutBridge.postMessage(eventString)

        val captor = argumentCaptor<CheckoutException>()
        verify(mockListener).onCheckoutViewFailedWithError(captor.capture())

        val error = captor.firstValue
        assertThat(error).isInstanceOf(CheckoutKitException::class.java)
        assertThat(error.message).isEqualTo("Error decoding message from checkout.")
        assertThat(error.errorCode).isEqualTo(CheckoutKitException.ERROR_RECEIVING_MESSAGE_FROM_CHECKOUT)
    }
}
