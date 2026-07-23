package com.shopify.checkout_kit_android_demo.settings.authentication.data.source.local

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.shopify.checkout_kit_android_demo.settings.authentication.data.AccessToken
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.security.KeyStore
import java.util.Base64
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Stores Customer Account credentials encrypted by a non-exportable Android Keystore key. */
class CustomerAccessTokenStore(
    private val appContext: Context,
    private val json: Json = Json { ignoreUnknownKeys = true },
    private val tokenCipher: TokenCipher = AndroidKeystoreTokenCipher(),
) {
    private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = PREFS_NAME)
    private val tokenKey = stringPreferencesKey(KEY)

    suspend fun find(): AccessToken? {
        val encryptedToken = appContext.dataStore.data.map { it[tokenKey] }.first() ?: return null
        return try {
            json.decodeFromString<AccessToken>(tokenCipher.decrypt(encryptedToken))
        } catch (error: Exception) {
            // A restored ciphertext cannot be decrypted on another device, and an invalidated
            // Keystore key must fail closed rather than exposing or reusing credentials.
            delete()
            null
        }
    }

    suspend fun save(accessToken: AccessToken) {
        val encryptedToken = tokenCipher.encrypt(json.encodeToString(accessToken))
        appContext.dataStore.edit { preferences ->
            preferences[tokenKey] = encryptedToken
        }
    }

    suspend fun delete() {
        appContext.dataStore.edit { preferences ->
            preferences.remove(tokenKey)
        }
    }

    private companion object {
        const val PREFS_NAME = "customer_access_tokens"
        const val KEY = "token"
    }
}

interface TokenCipher {
    fun encrypt(plaintext: String): String
    fun decrypt(ciphertext: String): String
}

private class AndroidKeystoreTokenCipher : TokenCipher {
    override fun encrypt(plaintext: String): String {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, secretKey())
        val encrypted = cipher.doFinal(plaintext.toByteArray(Charsets.UTF_8))
        return listOf(
            FORMAT_VERSION,
            Base64.getUrlEncoder().withoutPadding().encodeToString(cipher.iv),
            Base64.getUrlEncoder().withoutPadding().encodeToString(encrypted),
        ).joinToString(SEPARATOR)
    }

    override fun decrypt(ciphertext: String): String {
        val parts = ciphertext.split(SEPARATOR)
        require(parts.size == 3 && parts[0] == FORMAT_VERSION)
        val iv = Base64.getUrlDecoder().decode(parts[1])
        val encrypted = Base64.getUrlDecoder().decode(parts[2])
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.DECRYPT_MODE, secretKey(), GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv))
        return cipher.doFinal(encrypted).toString(Charsets.UTF_8)
    }

    private fun secretKey(): SecretKey {
        val keyStore = KeyStore.getInstance(KEYSTORE_PROVIDER).apply { load(null) }
        (keyStore.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }

        val keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE_PROVIDER)
        keyGenerator.init(
            KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build(),
        )
        return keyGenerator.generateKey()
    }

    private companion object {
        const val KEYSTORE_PROVIDER = "AndroidKeyStore"
        const val KEY_ALIAS = "checkout_kit_demo_customer_account_token"
        const val TRANSFORMATION = "AES/GCM/NoPadding"
        const val GCM_TAG_LENGTH_BITS = 128
        const val FORMAT_VERSION = "v1"
        const val SEPARATOR = ":"
    }
}
