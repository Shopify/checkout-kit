package com.shopify.checkoutkit

import android.net.Uri
import androidx.core.net.toUri
import com.shopify.ucp.embedded.checkout.EmbeddedCheckoutProtocol
import com.shopify.ucp.embedded.checkout.InstrumentsChangeResultUcp
import com.shopify.ucp.embedded.checkout.Message
import com.shopify.ucp.embedded.checkout.MessageType
import com.shopify.ucp.embedded.checkout.RequestDescriptor
import com.shopify.ucp.embedded.checkout.Severity
import com.shopify.ucp.embedded.checkout.UCPCheckoutResponseSchemaStatus
import com.shopify.ucp.embedded.checkout.requestDescriptor
import kotlinx.serialization.Serializable
import java.net.URI

/** Payload delivered with the [CheckoutProtocol.windowOpen] request. */
@ConsistentCopyVisibility
public data class WindowOpenRequest internal constructor(public val url: Uri)

/**
 * Outcome a [CheckoutProtocol.windowOpen] handler returns to the checkout page.
 *
 * [Success] indicates the URL was opened externally.
 * [Rejected] indicates the URL could not be opened, so checkout receives a UCP
 * `window_open_rejected_error` envelope and may surface fallback UI.
 */
public sealed class WindowOpenResult {
    public object Success : WindowOpenResult()
    public data class Rejected(public val reason: String? = null) : WindowOpenResult()
}

internal val checkoutKitWindowOpenDescriptor: RequestDescriptor<WindowOpenRequest, WindowOpenResult> =
    requestDescriptor(
        method = WINDOW_OPEN_METHOD,
        delegation = WINDOW_OPEN_DELEGATION,
        requestSerializer = WindowOpenParams.serializer(),
        responseSerializer = WindowOpenResultDto.serializer(),
        decode = { params ->
            params.url
                .takeIf { it.isNotBlank() }
                ?.takeIf { runCatching { URI(it) }.isSuccess }
                ?.toUri()
                ?.let(::WindowOpenRequest)
        },
        encode = ::encodeWindowOpenResult,
    )

private const val WINDOW_OPEN_METHOD: String = "ec.window.open_request"
private const val WINDOW_OPEN_DELEGATION: String = "window.open"

private fun encodeWindowOpenResult(result: WindowOpenResult): WindowOpenResultDto = when (result) {
    is WindowOpenResult.Success ->
        WindowOpenResultDto(
            ucp = InstrumentsChangeResultUcp(
                status = UCPCheckoutResponseSchemaStatus.Success,
                version = EmbeddedCheckoutProtocol.SPEC_VERSION,
            ),
        )
    is WindowOpenResult.Rejected ->
        WindowOpenResultDto(
            ucp = InstrumentsChangeResultUcp(
                status = UCPCheckoutResponseSchemaStatus.Error,
                version = EmbeddedCheckoutProtocol.SPEC_VERSION,
            ),
            messages = listOf(
                Message(
                    type = MessageType.Error,
                    code = "window_open_rejected_error",
                    content = result.reason ?: "Window open rejected",
                    severity = Severity.Unrecoverable,
                ),
            ),
        )
}

@Serializable
private data class WindowOpenParams(
    val url: String,
)

@Serializable
private data class WindowOpenResultDto(
    val ucp: InstrumentsChangeResultUcp,
    val messages: List<Message>? = null,
)
