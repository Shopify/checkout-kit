package com.shopify.checkoutkit.androiddemo.settings.authentication.data.source.local

import com.google.crypto.tink.Aead
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.Test
import java.io.IOException
import java.security.GeneralSecurityException
import java.util.concurrent.atomic.AtomicInteger

class KeysetAeadFactoryTest {
    @Test
    fun `does not reset a keyset when registration fails`() {
        val resetCalls = AtomicInteger()
        val loadCalls = AtomicInteger()
        val factory = KeysetAeadFactory(
            register = { throw GeneralSecurityException("Unable to register AEAD") },
            load = {
                loadCalls.incrementAndGet()
                IdentityAead()
            },
            reset = { resetCalls.incrementAndGet() }
        )

        assertThatThrownBy { factory.create() }.isInstanceOf(GeneralSecurityException::class.java)
        assertThat(resetCalls.get()).isEqualTo(0)
        assertThat(loadCalls.get()).isEqualTo(0)
    }

    @Test
    fun `resets a security-failed keyset before loading a replacement`() {
        val loadCalls = AtomicInteger()
        val resetCalls = AtomicInteger()
        val replacement = IdentityAead()
        val factory = KeysetAeadFactory(
            register = {},
            load = {
                if (loadCalls.incrementAndGet() == 1) {
                    throw GeneralSecurityException("Keyset is unavailable")
                }
                replacement
            },
            reset = { resetCalls.incrementAndGet() }
        )

        assertThat(factory.create()).isSameAs(replacement)
        assertThat(loadCalls.get()).isEqualTo(2)
        assertThat(resetCalls.get()).isEqualTo(1)
    }

    @Test
    fun `does not reset a keyset after an IO failure`() {
        val resetCalls = AtomicInteger()
        val factory = KeysetAeadFactory(
            register = {},
            load = { throw IOException("Keyset is temporarily unreadable") },
            reset = { resetCalls.incrementAndGet() }
        )

        assertThatThrownBy { factory.create() }.isInstanceOf(IOException::class.java)
        assertThat(resetCalls.get()).isEqualTo(0)
    }

    private class IdentityAead : Aead {
        override fun encrypt(plaintext: ByteArray, associatedData: ByteArray): ByteArray = plaintext

        override fun decrypt(ciphertext: ByteArray, associatedData: ByteArray): ByteArray = ciphertext
    }
}
