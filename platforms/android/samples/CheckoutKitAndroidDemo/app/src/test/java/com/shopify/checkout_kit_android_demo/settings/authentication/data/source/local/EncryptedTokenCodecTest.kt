package com.shopify.checkout_kit_android_demo.settings.authentication.data.source.local

import com.google.crypto.tink.Aead
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.Test
import java.security.GeneralSecurityException

class EncryptedTokenCodecTest {
    private val codec = EncryptedTokenCodec(FakeAead())

    @Test
    fun `round trips plaintext with a versioned ciphertext`() {
        val encrypted = codec.encrypt("customer token")

        assertThat(encrypted).startsWith("v1:")
        assertThat(codec.decrypt(encrypted)).isEqualTo("customer token")
    }

    @Test
    fun `rejects ciphertext with an unknown format version`() {
        assertThatThrownBy { codec.decrypt("v2:customer token") }
            .isInstanceOf(IllegalArgumentException::class.java)
    }

    @Test
    fun `rejects ciphertext without a version delimiter`() {
        assertThatThrownBy { codec.decrypt("corrupted ciphertext") }
            .isInstanceOf(IllegalArgumentException::class.java)
    }

    @Test
    fun `rejects ciphertext without a payload`() {
        assertThatThrownBy { codec.decrypt("v1:") }
            .isInstanceOf(IllegalArgumentException::class.java)
    }

    @Test
    fun `rejects ciphertext that is not valid base64`() {
        assertThatThrownBy { codec.decrypt("v1:not*valid*base64") }
            .isInstanceOf(IllegalArgumentException::class.java)
    }

    private class FakeAead : Aead {
        override fun encrypt(plaintext: ByteArray, associatedData: ByteArray): ByteArray {
            if (!associatedData.contentEquals(tokenAssociatedData())) {
                throw GeneralSecurityException("Unexpected associated data")
            }
            return plaintext
        }

        override fun decrypt(ciphertext: ByteArray, associatedData: ByteArray): ByteArray {
            if (!associatedData.contentEquals(tokenAssociatedData())) {
                throw GeneralSecurityException("Unexpected associated data")
            }
            return ciphertext
        }
    }
}
