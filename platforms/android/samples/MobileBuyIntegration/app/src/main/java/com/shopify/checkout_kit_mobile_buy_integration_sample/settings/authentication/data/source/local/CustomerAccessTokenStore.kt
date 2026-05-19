package com.shopify.checkout_kit_mobile_buy_integration_sample.settings.authentication.data.source.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.shopify.checkout_kit_mobile_buy_integration_sample.settings.authentication.data.AccessToken
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

/**
 * Token Store backed by DataStore with file-level encryption to allow storing and reusing tokens
 * until they have expired.
 */
class CustomerAccessTokenStore(
    private val appContext: Context,
    private val json: Json = Json { ignoreUnknownKeys = true }
) {
    private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(
        name = PREFS_NAME,
        produceMigrations = { listOf() }
    )

    private val tokenKey = stringPreferencesKey(KEY)

    /**
     * Find currently stored token
     */
    suspend fun find(): AccessToken? = appContext.dataStore.data
        .map { preferences ->
            preferences[tokenKey]?.let { tokenString ->
                json.decodeFromString<AccessToken>(tokenString)
            }
        }
        .first()

    /**
     * Save token to the store
     */
    suspend fun save(accessToken: AccessToken) {
        appContext.dataStore.edit { preferences ->
            preferences[tokenKey] = json.encodeToString(accessToken)
        }
    }

    /**
     * Delete a token from the store
     */
    suspend fun delete() {
        appContext.dataStore.edit { preferences ->
            preferences.remove(tokenKey)
        }
    }

    companion object {
        private const val PREFS_NAME = "customer_access_tokens"
        private const val KEY = "token"
    }
}
