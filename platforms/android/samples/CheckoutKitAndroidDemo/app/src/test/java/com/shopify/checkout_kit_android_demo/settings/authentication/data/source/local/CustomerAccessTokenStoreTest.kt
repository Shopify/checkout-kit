package com.shopify.checkout_kit_android_demo.settings.authentication.data.source.local

import com.shopify.checkout_kit_android_demo.settings.authentication.data.AccessToken
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

@RunWith(RobolectricTestRunner::class)
class CustomerAccessTokenStoreTest {
    @Test
    fun `credentials pass through cipher before persistence`() = runBlocking {
        val cipher = RecordingTokenCipher()
        val store = CustomerAccessTokenStore(
            appContext = RuntimeEnvironment.getApplication(),
            json = Json,
            tokenCipher = cipher,
        )
        val token = AccessToken(
            accessToken = "access-token",
            refreshToken = "refresh-token",
            tokenType = "Bearer",
            expiresIn = 300,
            idToken = "id-token",
        )

        store.save(token)

        assertThat(cipher.encryptedPlaintext).contains("access-token")
        assertThat(store.find()).isEqualTo(token)
        assertThat(cipher.decryptedCiphertext).startsWith("encrypted:")

        store.delete()
        assertThat(store.find()).isNull()
    }

    private class RecordingTokenCipher : TokenCipher {
        var encryptedPlaintext: String? = null
        var decryptedCiphertext: String? = null

        override fun encrypt(plaintext: String): String {
            encryptedPlaintext = plaintext
            return "encrypted:$plaintext"
        }

        override fun decrypt(ciphertext: String): String {
            decryptedCiphertext = ciphertext
            return ciphertext.removePrefix("encrypted:")
        }
    }
}
