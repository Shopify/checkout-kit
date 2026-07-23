package com.shopify.checkout_kit_android_demo.settings.authentication.utils

import kotlinx.serialization.json.Json
import org.assertj.core.api.Assertions.assertThatCode
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.Test
import java.time.Instant
import java.util.Base64

class IDTokenValidatorTest {
    private val now = Instant.ofEpochSecond(2_000_000)
    private val validator = IDTokenValidator(
        issuer = ISSUER,
        clientId = CLIENT_ID,
        json = Json,
        clock = { now },
    )

    @Test
    fun `accepts bound claims and Shopify numeric subject`() {
        val token = token(claims(nonce = "expected"))

        assertThatCode { validator.validate(token, "expected") }.doesNotThrowAnyException()
    }

    @Test
    fun `rejects an incorrect nonce`() {
        val token = token(claims(nonce = "different"))

        assertThatThrownBy { validator.validate(token, "expected") }
            .isInstanceOf(AuthenticationException::class.java)
            .hasMessageContaining("nonce")
    }

    @Test
    fun `rejects an incorrect audience`() {
        val token = token(claims(audience = "another-client"))

        assertThatThrownBy { validator.validate(token, "expected") }
            .isInstanceOf(AuthenticationException::class.java)
            .hasMessageContaining("audience")
    }

    @Test
    fun `rejects an expired token`() {
        val token = token(claims(expiration = now.epochSecond - 61))

        assertThatThrownBy { validator.validate(token, "expected") }
            .isInstanceOf(AuthenticationException::class.java)
            .hasMessageContaining("Expired")
    }

    private fun claims(
        nonce: String = "expected",
        audience: String = CLIENT_ID,
        expiration: Long = now.epochSecond + 300,
    ): String = """
        {
          "iss": "$ISSUER",
          "sub": 123456,
          "aud": "$audience",
          "exp": $expiration,
          "iat": ${now.epochSecond},
          "nonce": "$nonce"
        }
    """.trimIndent()

    private fun token(payload: String): String {
        val encoder = Base64.getUrlEncoder().withoutPadding()
        val header = encoder.encodeToString("{}".toByteArray())
        val claims = encoder.encodeToString(payload.toByteArray())
        return "$header.$claims.signature"
    }

    private companion object {
        const val CLIENT_ID = "customer-account-client"
        const val ISSUER = "https://shopify.com/authentication/123"
    }
}
