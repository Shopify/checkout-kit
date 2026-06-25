package com.shopify.ucp.embedded.checkout

import kotlinx.serialization.Serializable
import java.net.URI

internal val embeddedCheckoutStartDescriptor: NotificationDescriptor<Checkout> =
    checkoutDescriptor(EmbeddedCheckoutProtocol.Event.start)
internal val embeddedCheckoutCompleteDescriptor: NotificationDescriptor<Checkout> =
    checkoutDescriptor(EmbeddedCheckoutProtocol.Event.complete)
internal val embeddedCheckoutMessagesChangeDescriptor: NotificationDescriptor<Checkout> =
    checkoutDescriptor(EmbeddedCheckoutProtocol.Event.messagesChange)
internal val embeddedCheckoutLineItemsChangeDescriptor: NotificationDescriptor<Checkout> =
    checkoutDescriptor(EmbeddedCheckoutProtocol.Event.lineItemsChange)
internal val embeddedCheckoutTotalsChangeDescriptor: NotificationDescriptor<Checkout> =
    checkoutDescriptor(EmbeddedCheckoutProtocol.Event.totalsChange)
internal val embeddedCheckoutFulfillmentChangeDescriptor: NotificationDescriptor<Checkout> =
    checkoutDescriptor(EmbeddedCheckoutProtocol.Event.fulfillmentChange)
internal val embeddedCheckoutErrorDescriptor: NotificationDescriptor<ErrorResponse> = notificationDescriptor(
    method = EmbeddedCheckoutProtocol.Event.error,
    paramsSerializer = ErrorParams.serializer(),
    decode = { it.error },
)
internal val embeddedCheckoutWindowOpenDescriptor: DelegationDescriptor<WindowOpenRequest, WindowOpenResult> =
    delegationDescriptor(
        method = EmbeddedCheckoutProtocol.Event.windowOpenRequest,
        delegation = "window.open",
        requestSerializer = WindowOpenParams.serializer(),
        responseSerializer = WindowOpenResultDto.serializer(),
        decode = { params ->
            params.url
                .takeIf { it.isNotBlank() }
                ?.let { runCatching { URI(it) }.getOrNull() }
                ?.let(::WindowOpenRequest)
        },
        encode = ::encodeWindowOpenResult,
    )

public data class WindowOpenRequest(public val url: URI)

public sealed class WindowOpenResult {
    public object Success : WindowOpenResult()
    public data class Rejected(public val reason: String? = null) : WindowOpenResult()
}

private fun checkoutDescriptor(method: String): NotificationDescriptor<Checkout> =
    notificationDescriptor(
        method = method,
        paramsSerializer = CheckoutParams.serializer(),
        decode = { it.checkout },
    )

private fun encodeWindowOpenResult(result: WindowOpenResult): WindowOpenResultDto = when (result) {
    is WindowOpenResult.Success ->
        WindowOpenResultDto(ucp = UcpEnvelope(EmbeddedCheckoutProtocol.SPEC_VERSION, "success"))
    is WindowOpenResult.Rejected ->
        WindowOpenResultDto(
            ucp = UcpEnvelope(EmbeddedCheckoutProtocol.SPEC_VERSION, "error"),
            messages = listOf(
                UcpMessage(
                    type = "error",
                    code = "window_open_rejected_error",
                    content = result.reason ?: "Window open rejected",
                    severity = "unrecoverable",
                )
            ),
        )
}

@Serializable
private data class CheckoutParams(
    val checkout: Checkout,
)

@Serializable
private data class ErrorParams(
    val error: ErrorResponse,
)

@Serializable
private data class WindowOpenParams(
    val url: String,
)

@Serializable
private data class UcpEnvelope(val version: String, val status: String)

@Serializable
private data class UcpMessage(
    val type: String,
    val code: String,
    val content: String,
    val severity: String,
)

@Serializable
private data class WindowOpenResultDto(
    val ucp: UcpEnvelope,
    val messages: List<UcpMessage>? = null,
)
