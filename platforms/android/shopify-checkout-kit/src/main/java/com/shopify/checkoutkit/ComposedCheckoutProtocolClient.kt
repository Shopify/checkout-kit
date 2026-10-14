package com.shopify.checkoutkit

import com.shopify.ucp.embedded.checkout.decodeProtocolRequest
import kotlinx.serialization.SerializationException

/**
 * Composes a merchant-supplied protocol client with kit-owned default handlers.
 *
 * The default bindings make the dispatch policy explicit in one place:
 * request delegations such as [CheckoutProtocol.windowOpen] only fall back to the
 * kit default when the merchant does not return a response, while mandatory kit
 * notifications such as [CheckoutProtocol.complete] always run after the merchant client.
 */
internal class ComposedCheckoutProtocolClient(
    private val merchant: CheckoutProtocol.Client?,
    private val defaults: Map<String, DefaultClientBinding>,
) {
    internal fun process(message: String): String? {
        val binding = method(message)?.let { defaults[it] }
            ?: return merchant?.process(message)

        return when (binding.policy) {
            DefaultClientPolicy.KitOwned ->
                binding.client.process(message)

            DefaultClientPolicy.AlwaysRunAfterMerchant -> {
                val response = merchant?.process(message)
                val defaultResponse = binding.client.process(message)
                response ?: defaultResponse
            }

            DefaultClientPolicy.RunIfUnhandled ->
                merchant?.process(message) ?: binding.client.process(message)
        }
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
    KitOwned,
    AlwaysRunAfterMerchant,
    RunIfUnhandled,
}
