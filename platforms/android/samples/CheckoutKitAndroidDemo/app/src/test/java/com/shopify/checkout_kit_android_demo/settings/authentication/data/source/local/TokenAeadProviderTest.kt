package com.shopify.checkout_kit_android_demo.settings.authentication.data.source.local

import com.google.crypto.tink.Aead
import java.security.GeneralSecurityException
import java.util.concurrent.atomic.AtomicInteger
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.runBlocking
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.Test

class TokenAeadProviderTest {
    @Test
    fun `does not cache a failed codec construction`() = runBlocking<Unit> {
        val factoryCalls = AtomicInteger()
        val provider = TokenAeadProvider {
            if (factoryCalls.incrementAndGet() == 1) {
                throw GeneralSecurityException("Unable to load keyset")
            }
            EncryptedTokenCodec(IdentityAead())
        }

        assertThatThrownBy { runBlocking { provider.codec() } }
            .isInstanceOf(GeneralSecurityException::class.java)
        assertThat(provider.codec()).isNotNull()
        assertThat(factoryCalls.get()).isEqualTo(2)
    }

    @Test
    fun `creates one codec for concurrent callers`() = runBlocking<Unit> {
        val factoryCalls = AtomicInteger()
        val provider = TokenAeadProvider {
            factoryCalls.incrementAndGet()
            EncryptedTokenCodec(IdentityAead())
        }

        val codecs = coroutineScope {
            List(10) {
                async(Dispatchers.Default) { provider.codec() }
            }.awaitAll()
        }

        assertThat(factoryCalls.get()).isEqualTo(1)
        assertThat(codecs).allSatisfy { assertThat(it).isSameAs(codecs.first()) }
    }

    @Test
    fun `creates a replacement codec after invalidation`() = runBlocking<Unit> {
        val factoryCalls = AtomicInteger()
        val provider = TokenAeadProvider {
            factoryCalls.incrementAndGet()
            EncryptedTokenCodec(IdentityAead())
        }

        val original = provider.codec()
        provider.invalidate()
        val replacement = provider.codec()

        assertThat(factoryCalls.get()).isEqualTo(2)
        assertThat(replacement).isNotSameAs(original)
    }

    private class IdentityAead : Aead {
        override fun encrypt(plaintext: ByteArray, associatedData: ByteArray): ByteArray = plaintext

        override fun decrypt(ciphertext: ByteArray, associatedData: ByteArray): ByteArray = ciphertext
    }
}
