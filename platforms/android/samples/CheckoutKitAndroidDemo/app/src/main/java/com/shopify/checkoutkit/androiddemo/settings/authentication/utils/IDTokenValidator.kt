package com.shopify.checkoutkit.androiddemo.settings.authentication.utils

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
        val claims = parseClaims(idToken)
        validateIdentityClaims(claims)
        validateTemporalClaims(claims)
        validateNonce(claims, expectedNonce)
    }

    private fun parseClaims(idToken: String): TokenClaims {
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

        return TokenClaims(
            subject = claims.stringClaim("sub"),
            issuer = claims.stringClaim("iss"),
            audience = claims.audienceClaim(),
            authorizedParty = claims.stringClaim("azp"),
            expiration = claims.numericClaim("exp"),
            issuedAt = claims.numericClaim("iat"),
            nonce = claims.stringClaim("nonce"),
        )
    }

    private fun validateIdentityClaims(claims: TokenClaims) {
        if (claims.subject.isNullOrBlank()) throw AuthenticationException("Invalid ID token subject")
        if (claims.issuer != issuer) throw AuthenticationException("Invalid ID token issuer")
        if (!claims.audience.contains(clientId)) throw AuthenticationException("Invalid ID token audience")
        if ((claims.audience.size > 1 || claims.authorizedParty != null) && claims.authorizedParty != clientId) {
            throw AuthenticationException("Invalid ID token authorized party")
        }
    }

    private fun validateTemporalClaims(claims: TokenClaims) {
        if (
            claims.expiration == null ||
            Instant.ofEpochSecond(claims.expiration.toLong()).plusSeconds(CLOCK_SKEW_SECONDS).isBefore(clock())
        ) {
            throw AuthenticationException("Expired ID token")
        }
        if (
            claims.issuedAt == null ||
            Instant.ofEpochSecond(claims.issuedAt.toLong()).minusSeconds(CLOCK_SKEW_SECONDS).isAfter(clock())
        ) {
            throw AuthenticationException("Invalid ID token issue time")
        }
    }

    private fun validateNonce(claims: TokenClaims, expectedNonce: String?) {
        if (expectedNonce != null && claims.nonce != expectedNonce) {
            throw AuthenticationException("Invalid ID token nonce")
        }
    }

    private fun JsonObject.stringClaim(name: String): String? =
        (this[name] as? JsonPrimitive)?.contentOrNull

    private fun JsonObject.numericClaim(name: String): Double? =
        (this[name] as? JsonPrimitive)?.doubleOrNull

    private fun JsonObject.audienceClaim(): List<String> = when (val value = this["aud"]) {
        is JsonArray -> value.mapNotNull { (it as? JsonPrimitive)?.contentOrNull }
        is JsonPrimitive -> value.contentOrNull?.let(::listOf).orEmpty()
        else -> emptyList()
    }

    private companion object {
        const val CLOCK_SKEW_SECONDS = 60L
    }
}

private data class TokenClaims(
    val subject: String?,
    val issuer: String?,
    val audience: List<String>,
    val authorizedParty: String?,
    val expiration: Double?,
    val issuedAt: Double?,
    val nonce: String?,
)
