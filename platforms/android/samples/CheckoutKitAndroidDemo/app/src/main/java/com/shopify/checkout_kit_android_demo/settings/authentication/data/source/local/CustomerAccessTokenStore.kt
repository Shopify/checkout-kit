package com.shopify.checkout_kit_android_demo.settings.authentication.data.source.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.core.handlers.ReplaceFileCorruptionHandler
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.emptyPreferences
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.shopify.checkout_kit_android_demo.settings.authentication.data.AccessToken
import java.io.IOException
import java.security.GeneralSecurityException
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import timber.log.Timber

// Keep this name in sync with the DataStore exclusions in res/xml/data_extraction_rules.xml and
// res/xml/backup_rules.xml.
internal const val DATA_STORE_NAME = "customer_access_tokens"
internal const val TOKEN_PREFERENCE_KEY = "token"

internal val Context.customerAccessTokenDataStore: DataStore<Preferences> by preferencesDataStore(
    name = DATA_STORE_NAME,
    corruptionHandler = ReplaceFileCorruptionHandler { emptyPreferences() },
    produceMigrations = { listOf() }
)

/**
 * Token Store backed by Preferences DataStore. Token ciphertext is authenticated with Tink AEAD;
 * the Tink keyset is encrypted with an Android Keystore key.
 */
class CustomerAccessTokenStore internal constructor(
    private val tokenCodecProvider: TokenCodecProvider,
    private val dataStore: DataStore<Preferences>,
    private val json: Json = Json { ignoreUnknownKeys = true }
) {
    private val tokenKey = stringPreferencesKey(TOKEN_PREFERENCE_KEY)

    /**
     * Returns the currently stored token, or `null` when nothing is stored or the stored value
     * cannot be authenticated. An unreadable value is deleted as a side effect; see
     * [deleteUnusableToken].
     */
    suspend fun find(): AccessToken? {
        val storedValue = try {
            dataStore.data
                .map { preferences -> preferences[tokenKey] }
                .first()
        } catch (exception: IOException) {
            logTokenReadFailure(exception)
            return null
        } catch (exception: CancellationException) {
            throw exception
        } catch (exception: RuntimeException) {
            logTokenReadFailure(exception)
            return null
        } ?: return null

        val codec = try {
            tokenCodecProvider.codec()
        } catch (exception: GeneralSecurityException) {
            tokenCodecProvider.invalidate()
            logTokenReadFailure(exception)
            return null
        } catch (exception: IOException) {
            logTokenReadFailure(exception)
            return null
        } catch (exception: CancellationException) {
            throw exception
        } catch (exception: IllegalArgumentException) {
            logTokenReadFailure(exception)
            return null
        } catch (exception: RuntimeException) {
            // Android Keystore and Tink can report keyset failures as unchecked exceptions.
            tokenCodecProvider.invalidate()
            logTokenReadFailure(exception)
            return null
        }

        return try {
            json.decodeFromString<AccessToken>(codec.decrypt(storedValue))
        } catch (exception: GeneralSecurityException) {
            tokenCodecProvider.invalidate()
            deleteUnusableToken(storedValue, exception)
        } catch (exception: IOException) {
            deleteUnusableToken(storedValue, exception)
        } catch (exception: IllegalArgumentException) {
            deleteUnusableToken(storedValue, exception)
        } catch (exception: CancellationException) {
            throw exception
        } catch (exception: RuntimeException) {
            tokenCodecProvider.invalidate()
            deleteUnusableToken(storedValue, exception)
        }
    }

    /**
     * Encrypts and persists [accessToken]. Returns `false` when a Keystore, Tink, or DataStore
     * failure prevents persistence. The token is unavailable to subsequent reads, so callers must
     * treat `false` as a failed local sign-in.
     */
    suspend fun save(accessToken: AccessToken): Boolean = try {
        val encryptedToken = tokenCodecProvider.codec().encrypt(json.encodeToString(accessToken))
        dataStore.edit { preferences ->
            preferences[tokenKey] = encryptedToken
        }
        true
    } catch (exception: GeneralSecurityException) {
        tokenCodecProvider.invalidate()
        logTokenPersistenceFailure(exception)
        false
    } catch (exception: IOException) {
        logTokenPersistenceFailure(exception)
        false
    } catch (exception: CancellationException) {
        throw exception
    } catch (exception: IllegalArgumentException) {
        logTokenPersistenceFailure(exception)
        false
    } catch (exception: RuntimeException) {
        tokenCodecProvider.invalidate()
        logTokenPersistenceFailure(exception)
        false
    }

    /**
     * Delete a token from the store
     */
    suspend fun delete(): Boolean = try {
        dataStore.edit { preferences ->
            preferences.remove(tokenKey)
        }
        true
    } catch (exception: IOException) {
        logTokenDeletionFailure(exception)
        false
    } catch (exception: CancellationException) {
        throw exception
    } catch (exception: RuntimeException) {
        logTokenDeletionFailure(exception)
        false
    }

    /**
     * A token that cannot be decrypted may have been corrupted, restored onto a new device, or
     * encrypted by an Android Keystore key that was invalidated. Legacy plaintext values also
     * intentionally reach this path, requiring users to sign in again after upgrading. Remove it
     * rather than treating unverified data as an authenticated customer session. Log only the
     * exception type: exception messages or stack traces can contain serialized token data and must
     * not be sent to logs.
     */
    private suspend fun deleteUnusableToken(storedValue: String, exception: Exception): AccessToken? {
        Timber.w("Discarding unreadable customer access token (%s)", exception.javaClass.simpleName)
        try {
            dataStore.edit { preferences ->
                if (preferences[tokenKey] == storedValue) {
                    preferences.remove(tokenKey)
                }
            }
        } catch (deleteException: IOException) {
            logTokenDeletionFailure(deleteException)
        } catch (deleteException: CancellationException) {
            throw deleteException
        } catch (deleteException: RuntimeException) {
            logTokenDeletionFailure(deleteException)
        }
        return null
    }

    private fun logTokenReadFailure(exception: Exception) {
        Timber.w("Unable to read customer access token (%s)", exception.javaClass.simpleName)
    }

    private fun logTokenPersistenceFailure(exception: Exception) {
        Timber.w("Unable to persist customer access token (%s)", exception.javaClass.simpleName)
    }

    private fun logTokenDeletionFailure(exception: Exception) {
        Timber.w("Unable to delete customer access token (%s)", exception.javaClass.simpleName)
    }
}
