package com.shopify.checkout_kit_android_demo.settings.authentication.data.source.local

import android.content.Context
import com.google.crypto.tink.Aead
import com.google.crypto.tink.KeyTemplates
import com.google.crypto.tink.RegistryConfiguration
import com.google.crypto.tink.aead.AeadConfig
import com.google.crypto.tink.integration.android.AndroidKeysetManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import timber.log.Timber
import java.security.KeyStore
import kotlin.coroutines.cancellation.CancellationException

// SharedPreferences file name; this alone maps to
// shared_prefs/customer_access_token_keyset.xml and must match the XML backup exclusions.
internal const val KEYSET_PREFS_NAME = "customer_access_token_keyset"

/**
 * Creates and caches the codec used for customer access tokens.
 *
 * Tink keyset creation touches disk and Android Keystore, so creation happens on an IO dispatcher.
 * A keyset that fails with a security error (for example, after restoring app data onto another
 * device) is reset before a new codec is created. Android Keystore does not provide a reliable
 * cross-device subtype taxonomy for permanent failures, so this deliberately trades a possible
 * re-login after a transient security failure for a recoverable token-store state. IO failures
 * leave existing key material intact because they do not establish that it is unusable.
 */
internal class TokenAeadProvider internal constructor(
    private val codecFactory: () -> EncryptedTokenCodec
) : TokenCodecProvider {
    constructor(context: Context) : this({ EncryptedTokenCodec(createAead(context)) })

    private val codecMutex = Mutex()
    private var cachedCodec: EncryptedTokenCodec? = null

    override suspend fun codec(): EncryptedTokenCodec = withContext(Dispatchers.IO) {
        codecMutex.withLock {
            cachedCodec ?: codecFactory().also { cachedCodec = it }
        }
    }

    // Drops the cached codec only. Unreadable ciphertext is recovered by discarding it in the store.
    override suspend fun invalidate() {
        codecMutex.withLock {
            cachedCodec = null
        }
    }

    private companion object {
        // Entry name for the keyset in the SharedPreferences file. It intentionally matches its name.
        const val KEYSET_NAME = KEYSET_PREFS_NAME

        const val MASTER_KEY_ALIAS = "customer_access_token_master_key"
        const val ANDROID_KEY_STORE = "AndroidKeyStore"
        const val MASTER_KEY_URI = "android-keystore://$MASTER_KEY_ALIAS"

        private fun createAead(context: Context): Aead = KeysetAeadFactory(
            register = { AeadConfig.register() },
            load = { createAeadFromKeyset(context) },
            reset = { exception -> resetKeyset(context, exception) }
        ).create()

        private fun createAeadFromKeyset(context: Context): Aead {
            val keysetManager = AndroidKeysetManager.Builder()
                .withSharedPref(context, KEYSET_NAME, KEYSET_PREFS_NAME)
                .withKeyTemplate(KeyTemplates.get("AES256_GCM"))
                .withMasterKeyUri(MASTER_KEY_URI)
                .build()
            return keysetManager.keysetHandle.getPrimitive(
                RegistryConfiguration.get(),
                Aead::class.java
            )
        }

        private fun resetKeyset(context: Context, exception: Exception) {
            Timber.w("Replacing unavailable customer access token keyset (%s)", exception.javaClass.simpleName)
            val keysetRemoved = context.getSharedPreferences(KEYSET_PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .remove(KEYSET_NAME)
                .commit()
            if (!keysetRemoved) {
                Timber.w("Unable to delete customer access token keyset")
                return
            }
            try {
                KeyStore.getInstance(ANDROID_KEY_STORE).apply {
                    load(null)
                    deleteEntry(MASTER_KEY_ALIAS)
                }
            } catch (failure: CancellationException) {
                throw failure
            } catch (failure: Exception) {
                Timber.w("Unable to delete customer access token master key (%s)", failure.javaClass.simpleName)
            }
        }
    }
}
