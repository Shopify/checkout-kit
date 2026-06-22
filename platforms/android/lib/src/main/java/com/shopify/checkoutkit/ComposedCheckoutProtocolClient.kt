package com.shopify.checkoutkit

import com.shopify.ucp.embedded.checkout.decodeProtocolRequest
import kotlinx.serialization.SerializationException

/**
 * Composes a merchant-supplied protocol client with kit-owned default handlers.
 *
 * The default bindings make the dispatch policy explicit in one place:
 * request delegations such as [CheckoutProtocol.windowOpen] only fall back to the
 * kit default when the merchant does not return a response, while mandatory kit
 * notifications such as [CheckoutProtocol.error] always run after the merchant client.
 */
internal class ComposedCheckoutProtocolClient(
    private val merchant: CheckoutProtocol.Client?,
    private val defaults: Map<String, DefaultClientBinding>,
) {
    internal fun process(message: String): String? {
        val method = method(message) ?: return merchant?.process(message)
        var response = merchant?.process(message)

        defaults[method]?.let { binding ->
            when (binding.policy) {
                DefaultClientPolicy.AlwaysRunAfterMerchant -> {
                    val defaultResponse = binding.client.process(message)
                    response = response ?: defaultResponse
                }
                DefaultClientPolicy.RunIfUnhandled ->
                    if (response == null) {
                        response = binding.client.process(message)
                    }
            }
        }

        return response
    }

    private fun method(message: String): String? = try {
        decodeProtocolRequest(message).method
    } catch (_: SerializationException) {
        null
    }
}

internal data class DefaultClientBinding(
    val client: CheckoutProtocol.Client,
    val policy: DefaultClientPolicy,
)

internal enum class DefaultClientPolicy {
    AlwaysRunAfterMerchant,
    RunIfUnhandled,
}
