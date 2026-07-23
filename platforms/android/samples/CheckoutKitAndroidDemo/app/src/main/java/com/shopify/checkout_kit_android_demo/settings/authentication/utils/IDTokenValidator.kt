package com.shopify.checkout_kit_android_demo.settings.authentication.utils

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import java.time.Instant
import java.util.Base64

/**
 * Validates the OIDC claims that bind an ID token to this client and authorization request.
 *
 * The token is received directly from Shopify's TLS-protected token endpoint. This sample relies
 * on that channel rather than locally verifying the JWT signature; its claims must not be used to
 * authorize access to another service.
 */
class IDTokenValidator(
    private val issuer: String,
    private val clientId: String,
    private val json: Json,
    private val clock: () -> Instant = Instant::now,
) {
    fun validate(idToken: String, expectedNonce: String?) {
        val sections = idToken.split('.')
        if (sections.size != 3 || sections.any(String::isEmpty)) {
            throw AuthenticationException("Invalid ID token")
        }

        val claims = try {
            val payload = Base64.getUrlDecoder().decode(sections[1])
            json.parseToJsonElement(payload.decodeToString()) as JsonObject
        } catch (error: Exception) {
            throw AuthenticationException("Invalid ID token")
        }

        val subject = (claims["sub"] as? JsonPrimitive)?.contentOrNull
        val tokenIssuer = (claims["iss"] as? JsonPrimitive)?.contentOrNull
        val audience = when (val value = claims["aud"]) {
            is JsonArray -> value.mapNotNull { (it as? JsonPrimitive)?.contentOrNull }
            is JsonPrimitive -> value.contentOrNull?.let(::listOf).orEmpty()
            else -> emptyList()
        }
        val authorizedParty = (claims["azp"] as? JsonPrimitive)?.contentOrNull
        val expiration = (claims["exp"] as? JsonPrimitive)?.doubleOrNull
        val issuedAt = (claims["iat"] as? JsonPrimitive)?.doubleOrNull

        if (subject.isNullOrBlank()) throw AuthenticationException("Invalid ID token subject")
        if (tokenIssuer != issuer) throw AuthenticationException("Invalid ID token issuer")
        if (!audience.contains(clientId)) throw AuthenticationException("Invalid ID token audience")
        if ((audience.size > 1 || authorizedParty != null) && authorizedParty != clientId) {
            throw AuthenticationException("Invalid ID token authorized party")
        }
        if (expiration == null || Instant.ofEpochSecond(expiration.toLong()).plusSeconds(CLOCK_SKEW_SECONDS).isBefore(clock())) {
            throw AuthenticationException("Expired ID token")
        }
        if (issuedAt == null || Instant.ofEpochSecond(issuedAt.toLong()).minusSeconds(CLOCK_SKEW_SECONDS).isAfter(clock())) {
            throw AuthenticationException("Invalid ID token issue time")
        }
        if (expectedNonce != null && (claims["nonce"] as? JsonPrimitive)?.contentOrNull != expectedNonce) {
            throw AuthenticationException("Invalid ID token nonce")
        }
    }

    private companion object {
        const val CLOCK_SKEW_SECONDS = 60L
    }
}
