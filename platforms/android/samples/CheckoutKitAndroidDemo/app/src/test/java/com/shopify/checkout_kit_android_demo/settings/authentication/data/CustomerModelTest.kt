package com.shopify.checkout_kit_android_demo.settings.authentication.data

import org.assertj.core.api.Assertions.assertThat
import org.junit.Test

class CustomerModelTest {
    @Test
    fun `access token string representation redacts token material`() {
        val token = AccessToken(
            accessToken = "access-token-secret",
            refreshToken = "refresh-token-secret",
            tokenType = "Bearer",
            expiresIn = 3600,
            idToken = "id-token-secret",
            expiresAt = 1_000L
        )

        val stringRepresentation = token.toString()

        assertThat(stringRepresentation)
            .doesNotContain(token.accessToken, token.refreshToken, token.idToken!!)
    }
}
