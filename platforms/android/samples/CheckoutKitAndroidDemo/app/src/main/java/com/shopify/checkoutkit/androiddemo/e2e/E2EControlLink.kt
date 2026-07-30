package com.shopify.checkoutkit.androiddemo.e2e

import java.net.URI
import java.net.URISyntaxException
import java.net.URLDecoder

enum class E2EBuyerIdentityMode(val parameterValue: String) {
    GUEST("guest"),
    HARDCODED("hardcoded"),
    CUSTOMER_ACCOUNT("customerAccount"),
    ;

    companion object {
        fun from(parameterValue: String) = entries.firstOrNull { it.parameterValue == parameterValue }
    }
}

sealed interface E2EControlLink {
    data object Reset : E2EControlLink

    data class Cart(
        val variantId: String? = null,
        val productIndex: Int? = null,
        val quantity: Int = 1,
        val buyerIdentityMode: E2EBuyerIdentityMode? = null,
    ) : E2EControlLink

    data class SignIn(val email: String? = null) : E2EControlLink

    companion object {
        const val HOST = "e2e"

        private const val SCHEME_SEPARATOR = "://"
        private const val PARSE_ORIGIN_SCHEME = "https://"

        private val RESET_PARAMETERS = emptySet<String>()
        private val CART_PARAMETERS = setOf("variantId", "productIndex", "quantity", "buyerIdentityMode")
        private val SIGN_IN_PARAMETERS = setOf("email")

        fun parse(url: String): E2EControlLink? {
            val separatorIndex = url.indexOf(SCHEME_SEPARATOR)

            if (separatorIndex < 0) {
                return null
            }

            val authorityAndPath = url.substring(separatorIndex + SCHEME_SEPARATOR.length)
            val uri = try {
                URI(PARSE_ORIGIN_SCHEME + authorityAndPath)
            } catch (error: URISyntaxException) {
                return null
            }

            if (uri.host != HOST) {
                return null
            }

            val parameters = parameters(uri.rawQuery)

            return when (uri.path.orEmpty().trim('/')) {
                "reset" -> {
                    rejectUnknownParameters("reset", parameters, RESET_PARAMETERS)

                    Reset
                }

                "cart" -> {
                    rejectUnknownParameters("cart", parameters, CART_PARAMETERS)

                    cart(parameters)
                }

                "signIn" -> {
                    rejectUnknownParameters("signIn", parameters, SIGN_IN_PARAMETERS)

                    SignIn(email = signInEmail(parameters))
                }

                else -> throw IllegalArgumentException("Unsupported e2e command")
            }
        }

        private fun rejectUnknownParameters(
            command: String,
            parameters: Map<String, String>,
            allowed: Set<String>,
        ) {
            val unknown = parameters.keys.filterNot { allowed.contains(it) }.sorted()

            require(unknown.isEmpty()) { "Unknown $command parameters: ${unknown.joinToString(", ")}" }
        }

        private fun cart(parameters: Map<String, String>): Cart {
            require(parameters.isNotEmpty()) { "Missing variantId or productIndex" }

            val quantity = quantity(parameters)
            val buyerIdentityMode = buyerIdentityMode(parameters)
            val variantId = parameters["variantId"]
            val productIndexParameter = parameters["productIndex"]

            require(variantId == null || productIndexParameter == null) {
                "Use variantId or productIndex, not both"
            }

            if (variantId != null) {
                require(variantId.isNotEmpty()) { "variantId must not be blank" }

                return Cart(variantId = variantId, quantity = quantity, buyerIdentityMode = buyerIdentityMode)
            }

            requireNotNull(productIndexParameter) { "Missing variantId or productIndex" }

            val productIndex = productIndexParameter.toIntOrNull()

            require(productIndex != null && productIndex >= 0) { "productIndex must be a non-negative integer" }

            return Cart(productIndex = productIndex, quantity = quantity, buyerIdentityMode = buyerIdentityMode)
        }

        private fun quantity(parameters: Map<String, String>): Int {
            val parameter = parameters["quantity"] ?: return 1
            val quantity = parameter.toIntOrNull()

            require(quantity != null && quantity >= 1) { "quantity must be a positive integer" }

            return quantity
        }

        private fun buyerIdentityMode(parameters: Map<String, String>): E2EBuyerIdentityMode? {
            val parameter = parameters["buyerIdentityMode"] ?: return null

            return requireNotNull(E2EBuyerIdentityMode.from(parameter)) {
                "buyerIdentityMode must be guest, hardcoded, or customerAccount"
            }
        }

        private fun signInEmail(parameters: Map<String, String>): String? {
            val email = parameters["email"] ?: return null

            require(email.isNotEmpty()) { "email must not be blank" }

            return email
        }

        private fun parameters(rawQuery: String?): Map<String, String> {
            if (rawQuery.isNullOrEmpty()) {
                return emptyMap()
            }

            return rawQuery
                .split("&")
                .filter { it.isNotEmpty() }
                .associate { pair ->
                    val separatorIndex = pair.indexOf('=')

                    if (separatorIndex < 0) {
                        decode(pair) to ""
                    } else {
                        decode(pair.substring(0, separatorIndex)) to decode(pair.substring(separatorIndex + 1))
                    }
                }
        }

        private fun decode(value: String) = URLDecoder.decode(value, "UTF-8").trim()
    }
}
