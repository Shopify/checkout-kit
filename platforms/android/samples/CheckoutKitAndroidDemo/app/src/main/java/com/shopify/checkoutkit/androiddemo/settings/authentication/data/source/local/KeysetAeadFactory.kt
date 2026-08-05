package com.shopify.checkoutkit.androiddemo.settings.authentication.data.source.local

import com.google.crypto.tink.Aead
import java.security.GeneralSecurityException

/**
 * Creates an AEAD from a persisted keyset and resets that keyset only after a security failure.
 * IO failures are deliberately propagated because they do not prove the existing key material is
 * unusable.
 */
internal class KeysetAeadFactory(
    private val register: () -> Unit,
    private val load: () -> Aead,
    private val reset: (GeneralSecurityException) -> Unit
) {
    fun create(): Aead {
        // Registration is global and unrelated to the persisted keyset. Never reset key material
        // because it fails.
        register()

        return try {
            load()
        } catch (exception: GeneralSecurityException) {
            reset(exception)
            load()
        }
    }
}
