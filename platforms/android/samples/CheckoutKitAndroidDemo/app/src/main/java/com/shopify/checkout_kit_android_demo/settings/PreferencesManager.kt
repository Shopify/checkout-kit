package com.shopify.checkout_kit_android_demo.settings

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.shopify.checkout_kit_android_demo.settings.data.CheckoutSheetPreset
import com.shopify.checkout_kit_android_demo.settings.data.WindowOpenHandler
import com.shopify.checkoutkit.ColorScheme
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.Json

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "checkoutKitSettings")

class PreferencesManager(private val context: Context) {
    private val decoder: Json = Json { ignoreUnknownKeys = true }

    val userPreferencesFlow: Flow<UserPreferences> = context.dataStore.data.map { preferences ->
        val colorScheme = decoder.decodeFromString<ColorScheme>(
            preferences[COLOR_SCHEME] ?: DEFAULT_COLOR_SCHEME
        )
        val buyerIdentityDemoEnabled = preferences[BUYER_IDENTITY] ?: false
        val checkoutPreloadingEnabled = preferences[CHECKOUT_PRELOADING] ?: true
        val dragToDismissEnabled = preferences[DRAG_TO_DISMISS] ?: true
        val tapAwayToDismissEnabled = preferences[TAP_AWAY_TO_DISMISS] ?: true
        val windowOpenHandler = preferences[WINDOW_OPEN_HANDLER]?.let { value ->
            runCatching { WindowOpenHandler.valueOf(value) }.getOrNull()
        } ?: WindowOpenHandler.Default
        val checkoutSheetPreset = preferences[CHECKOUT_SHEET_PRESET]?.let { value ->
            runCatching { CheckoutSheetPreset.valueOf(value) }.getOrNull()
        } ?: CheckoutSheetPreset.NewDefaults

        UserPreferences(
            colorScheme = colorScheme,
            buyerIdentityDemoEnabled = buyerIdentityDemoEnabled,
            checkoutPreloadingEnabled = checkoutPreloadingEnabled,
            dragToDismissEnabled = dragToDismissEnabled,
            tapAwayToDismissEnabled = tapAwayToDismissEnabled,
            windowOpenHandler = windowOpenHandler,
            checkoutSheetPreset = checkoutSheetPreset,
        )
    }

    suspend fun setColorScheme(colorScheme: ColorScheme) =
        saveData(COLOR_SCHEME, Json.encodeToString(ColorScheme.serializer(), colorScheme))

    suspend fun setBuyerIdentityDemoEnabled(enabled: Boolean) = saveData(BUYER_IDENTITY, enabled)

    suspend fun setCheckoutPreloadingEnabled(enabled: Boolean) = saveData(CHECKOUT_PRELOADING, enabled)

    suspend fun setDragToDismissEnabled(enabled: Boolean) = saveData(DRAG_TO_DISMISS, enabled)

    suspend fun setTapAwayToDismissEnabled(enabled: Boolean) = saveData(TAP_AWAY_TO_DISMISS, enabled)

    suspend fun setWindowOpenHandler(handler: WindowOpenHandler) = saveData(WINDOW_OPEN_HANDLER, handler.name)

    suspend fun setCheckoutSheetPreset(preset: CheckoutSheetPreset) = saveData(CHECKOUT_SHEET_PRESET, preset.name)

    private suspend fun <T> saveData(key: Preferences.Key<T>, value: T) = context.dataStore.edit {
        it[key] = value
    }

    companion object {
        private val COLOR_SCHEME = stringPreferencesKey("colorScheme")
        private val BUYER_IDENTITY = booleanPreferencesKey("buyerIdentity")
        private val CHECKOUT_PRELOADING = booleanPreferencesKey("checkoutPreloading")
        private val DRAG_TO_DISMISS = booleanPreferencesKey("dragToDismiss")
        private val TAP_AWAY_TO_DISMISS = booleanPreferencesKey("tapAwayToDismiss")
        private val WINDOW_OPEN_HANDLER = stringPreferencesKey("windowOpenHandler")
        private val CHECKOUT_SHEET_PRESET = stringPreferencesKey("checkoutSheetStyle")

        private val DEFAULT_COLOR_SCHEME = Json.encodeToString(
            ColorScheme.serializer(),
            ColorScheme.Automatic()
        )
    }
}

data class UserPreferences(
    val colorScheme: ColorScheme,
    val buyerIdentityDemoEnabled: Boolean,
    val checkoutPreloadingEnabled: Boolean,
    val dragToDismissEnabled: Boolean,
    val tapAwayToDismissEnabled: Boolean,
    val windowOpenHandler: WindowOpenHandler,
    val checkoutSheetPreset: CheckoutSheetPreset,
)
