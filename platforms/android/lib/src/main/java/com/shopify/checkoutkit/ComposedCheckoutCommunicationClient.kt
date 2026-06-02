package com.shopify.checkoutkit

import kotlinx.serialization.SerializationException

/**
 * Composes a merchant-supplied protocol client with kit-owned default handlers.
 *
 * The default bindings make the dispatch policy explicit in one place:
 * request delegations such as [CheckoutProtocol.windowOpen] only fall back to the
 * kit default when the merchant does not return a response, while mandatory kit
 * notifications such as [CheckoutProtocol.error] always run after the merchant client.
 */
internal class ComposedCheckoutCommunicationClient(
    private val merchant: CheckoutCommunicationClient?,
    private val defaults: Map<String, DefaultClientBinding>,
) : CheckoutCommunicationClient {
    override fun process(message: String): String? {
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
        CheckoutProtocol.json.decodeFromString<EcpRequest>(message).method
    } catch (_: SerializationException) {
        null
    }
}

internal data class DefaultClientBinding(
    val client: CheckoutCommunicationClient,
    val policy: DefaultClientPolicy,
)

internal enum class DefaultClientPolicy {
    AlwaysRunAfterMerchant,
    RunIfUnhandled,
}
