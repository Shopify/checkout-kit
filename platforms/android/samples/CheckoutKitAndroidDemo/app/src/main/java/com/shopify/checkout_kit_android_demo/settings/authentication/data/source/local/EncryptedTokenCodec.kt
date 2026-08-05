package com.shopify.checkout_kit_android_demo.settings.authentication.data.source.local

import com.google.crypto.tink.Aead
import java.nio.charset.StandardCharsets.UTF_8
import java.util.Base64

internal const val TOKEN_ASSOCIATED_DATA_LABEL = "com.shopify.checkout-kit.demo.customer-access-token"

internal fun tokenAssociatedData(): ByteArray = TOKEN_ASSOCIATED_DATA_LABEL.toByteArray(UTF_8)

/**
 * Serializes authenticated ciphertext for the customer access-token DataStore value.
 *
 * The associated data prevents ciphertext for another stored value from being accepted
 * as a customer token. Tink owns nonce generation and authenticated encryption.
 */
internal class EncryptedTokenCodec(
    private val aead: Aead
) {
    fun encrypt(plaintext: String): String {
        val ciphertext = aead.encrypt(plaintext.toByteArray(UTF_8), tokenAssociatedData())
        return "$FORMAT_VERSION:${Base64.getEncoder().encodeToString(ciphertext)}"
    }

    /**
     * @throws IllegalArgumentException when [storedValue] is not a supported v1 payload, including
     * legacy plaintext values. Callers use this to discard malformed ciphertext without evicting
     * cached key material.
     * @throws java.security.GeneralSecurityException when ciphertext authentication fails. Callers
     * use this to discard the value and invalidate the cached codec.
     */
    fun decrypt(storedValue: String): String {
        val parts = storedValue.split(":", limit = 2)
        require(parts.size == 2) { "Encrypted token is missing a version prefix" }
        val (version, encodedCiphertext) = parts
        require(version == FORMAT_VERSION) { "Unsupported encrypted token format" }
        require(encodedCiphertext.isNotEmpty()) { "Encrypted token ciphertext is missing" }

        val plaintext = aead.decrypt(
            Base64.getDecoder().decode(encodedCiphertext),
            tokenAssociatedData()
        )
        return plaintext.toString(UTF_8)
    }

    private companion object {
        const val FORMAT_VERSION = "v1"
    }
}
