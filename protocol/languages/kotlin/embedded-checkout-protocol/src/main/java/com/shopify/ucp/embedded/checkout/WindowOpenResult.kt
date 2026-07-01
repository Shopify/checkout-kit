package com.shopify.ucp.embedded.checkout

public fun windowOpenSuccess(version: String = EmbeddedCheckoutProtocol.SPEC_VERSION): WindowOpenResult =
    WindowOpenResult(
        ucp = InstrumentsChangeResultUcp(
            status = UCPCheckoutResponseSchemaStatus.Success,
            version = version,
        ),
    )

public fun windowOpenRejected(
    reason: String? = null,
    version: String = EmbeddedCheckoutProtocol.SPEC_VERSION,
): WindowOpenResult =
    WindowOpenResult(
        ucp = InstrumentsChangeResultUcp(
            status = UCPCheckoutResponseSchemaStatus.Error,
            version = version,
        ),
        messages = listOf(
            Message(
                code = "window_open_rejected_error",
                content = reason ?: "Window open rejected",
                severity = Severity.Unrecoverable,
                type = MessageType.Error,
            ),
        ),
    )
