package com.shopify.checkoutkit.androiddemo.settings

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.shopify.checkoutkit.CheckoutAppearance
import com.shopify.checkoutkit.ColorScheme
import com.shopify.checkoutkit.androiddemo.common.sampleStorefrontAppearance
import com.shopify.checkoutkit.androiddemo.settings.data.CheckoutPresentationMode
import com.shopify.checkoutkit.androiddemo.settings.data.CheckoutSheetPreset
import com.shopify.checkoutkit.androiddemo.settings.data.WindowOpenHandler
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.serialization.json.Json

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "checkoutKitSettings")

class PreferencesManager(
    context: Context,
    private val dataStore: DataStore<Preferences> = context.dataStore,
) {
    private val decoder: Json = Json { ignoreUnknownKeys = true }

    val userPreferencesFlow: Flow<UserPreferences> = dataStore.data.map { preferences ->
        val appearance = preferences[APPEARANCE]?.let { value ->
            runCatching {
                decoder.decodeFromString<CheckoutAppearance>(value)
            }.getOrNull()
        } ?: preferences[COLOR_SCHEME]?.let { value ->
            runCatching {
                CheckoutAppearance.App(
                    decoder.decodeFromString<ColorScheme>(value)
                )
            }.getOrNull()
        } ?: sampleStorefrontAppearance()
        val buyerIdentityDemoEnabled = preferences[BUYER_IDENTITY] ?: false
        val checkoutPreloadingEnabled = preferences[CHECKOUT_PRELOADING] ?: true
        val checkoutPresentationMode = preferences[CHECKOUT_PRESENTATION_MODE]?.let { value ->
            runCatching { CheckoutPresentationMode.valueOf(value) }.getOrNull()
        } ?: CheckoutPresentationMode.CheckoutKitSheet
        val dragToDismissEnabled = preferences[DRAG_TO_DISMISS] ?: true
        val tapAwayToDismissEnabled = preferences[TAP_AWAY_TO_DISMISS] ?: true
        val windowOpenHandler = preferences[WINDOW_OPEN_HANDLER]?.let { value ->
            when (value) {
                "CustomTabs" -> WindowOpenHandler.Default
                else -> runCatching { WindowOpenHandler.valueOf(value) }.getOrNull()
            }
        } ?: WindowOpenHandler.Default
        val checkoutSheetPreset = preferences[CHECKOUT_SHEET_PRESET]?.let { value ->
            runCatching { CheckoutSheetPreset.valueOf(value) }.getOrNull()
        } ?: CheckoutSheetPreset.NewDefaults

        UserPreferences(
            appearance = appearance,
            buyerIdentityDemoEnabled = buyerIdentityDemoEnabled,
            checkoutPreloadingEnabled = checkoutPreloadingEnabled,
            checkoutPresentationMode = checkoutPresentationMode,
            dragToDismissEnabled = dragToDismissEnabled,
            tapAwayToDismissEnabled = tapAwayToDismissEnabled,
            windowOpenHandler = windowOpenHandler,
            checkoutSheetPreset = checkoutSheetPreset,
        )
    }

    suspend fun setAppearance(appearance: CheckoutAppearance) =
        saveData(APPEARANCE, Json.encodeToString(CheckoutAppearance.serializer(), appearance))

    suspend fun setBuyerIdentityDemoEnabled(enabled: Boolean) = saveData(BUYER_IDENTITY, enabled)

    suspend fun setCheckoutPreloadingEnabled(enabled: Boolean) = saveData(CHECKOUT_PRELOADING, enabled)

    suspend fun setCheckoutPresentationMode(mode: CheckoutPresentationMode) = saveData(
        CHECKOUT_PRESENTATION_MODE,
        mode.name
    )

    suspend fun setDragToDismissEnabled(enabled: Boolean) = saveData(DRAG_TO_DISMISS, enabled)

    suspend fun setTapAwayToDismissEnabled(enabled: Boolean) = saveData(TAP_AWAY_TO_DISMISS, enabled)

    suspend fun setWindowOpenHandler(handler: WindowOpenHandler) = saveData(WINDOW_OPEN_HANDLER, handler.name)

    suspend fun setCheckoutSheetPreset(preset: CheckoutSheetPreset) = saveData(CHECKOUT_SHEET_PRESET, preset.name)

    private suspend fun <T> saveData(key: Preferences.Key<T>, value: T) = dataStore.edit {
        it[key] = value
    }

    companion object {
        private val COLOR_SCHEME = stringPreferencesKey("colorScheme")
        private val APPEARANCE = stringPreferencesKey("appearance")
        private val BUYER_IDENTITY = booleanPreferencesKey("buyerIdentity")
        private val CHECKOUT_PRELOADING = booleanPreferencesKey("checkoutPreloading")
        private val CHECKOUT_PRESENTATION_MODE = stringPreferencesKey("checkoutPresentationMode")
        private val DRAG_TO_DISMISS = booleanPreferencesKey("dragToDismiss")
        private val TAP_AWAY_TO_DISMISS = booleanPreferencesKey("tapAwayToDismiss")
        private val WINDOW_OPEN_HANDLER = stringPreferencesKey("windowOpenHandler")
        private val CHECKOUT_SHEET_PRESET = stringPreferencesKey("checkoutSheetStyle")
    }
}

data class UserPreferences(
    val appearance: CheckoutAppearance,
    val buyerIdentityDemoEnabled: Boolean,
    val checkoutPreloadingEnabled: Boolean,
    val checkoutPresentationMode: CheckoutPresentationMode,
    val dragToDismissEnabled: Boolean,
    val tapAwayToDismissEnabled: Boolean,
    val windowOpenHandler: WindowOpenHandler,
    val checkoutSheetPreset: CheckoutSheetPreset,
)
