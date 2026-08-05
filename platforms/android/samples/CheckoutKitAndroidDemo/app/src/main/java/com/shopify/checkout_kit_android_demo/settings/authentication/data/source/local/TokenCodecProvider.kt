package com.shopify.checkout_kit_android_demo.settings.authentication.data.source.local

/**
 * Supplies the codec used to encrypt customer access tokens.
 *
 * [codec] may throw [java.security.GeneralSecurityException], [java.io.IOException], or unchecked
 * Android Keystore/Tink failures. Implementations must not cache failed codec construction.
 * [invalidate] drops any cached codec so the next [codec] call re-derives it from the keyset and
 * master key. It does not regenerate key material; recovery is handled when keyset loading fails
 * with a [java.security.GeneralSecurityException].
 */
internal interface TokenCodecProvider {
    suspend fun codec(): EncryptedTokenCodec

    suspend fun invalidate()
}
