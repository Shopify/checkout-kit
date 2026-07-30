package com.shopify.checkoutkit.androiddemo.settings

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.shopify.checkoutkit.androiddemo.settings.data.CheckoutPresentationMode
import com.shopify.checkoutkit.androiddemo.settings.data.CheckoutSheetPreset
import com.shopify.checkoutkit.androiddemo.settings.data.WindowOpenHandler
import java.io.File
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

@RunWith(RobolectricTestRunner::class)
class PreferencesManagerTest {
    private lateinit var scope: CoroutineScope
    private lateinit var dataStore: DataStore<Preferences>
    private lateinit var preferences: PreferencesManager

    @Before
    fun setUp() {
        scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
        dataStore = PreferenceDataStoreFactory.create(scope = scope) {
            File.createTempFile("checkout-kit-settings", ".preferences_pb").apply { delete() }
        }
        preferences = PreferencesManager(RuntimeEnvironment.getApplication(), dataStore)
    }

    @After
    fun tearDown() {
        scope.cancel()
    }

    @Test
    fun `uses safe defaults when no settings have been saved`() = runBlocking {
        val settings = preferences.userPreferencesFlow.first()

        assertTrue(settings.appearance is com.shopify.checkoutkit.CheckoutAppearance.Storefront)
        assertFalse(settings.buyerIdentityDemoEnabled)
        assertTrue(settings.checkoutPreloadingEnabled)
        assertEquals(CheckoutPresentationMode.CheckoutKitSheet, settings.checkoutPresentationMode)
        assertTrue(settings.dragToDismissEnabled)
        assertTrue(settings.tapAwayToDismissEnabled)
        assertEquals(WindowOpenHandler.Default, settings.windowOpenHandler)
        assertEquals(CheckoutSheetPreset.NewDefaults, settings.checkoutSheetPreset)
    }

    @Test
    fun `persists checkout settings`() = runBlocking {
        preferences.setBuyerIdentityDemoEnabled(true)
        preferences.setCheckoutPreloadingEnabled(false)
        preferences.setCheckoutPresentationMode(CheckoutPresentationMode.AppOwnedComposeSheet)
        preferences.setDragToDismissEnabled(false)
        preferences.setTapAwayToDismissEnabled(false)
        preferences.setWindowOpenHandler(WindowOpenHandler.CustomTabs)
        preferences.setCheckoutSheetPreset(CheckoutSheetPreset.LegacyDialog)

        val reloaded = PreferencesManager(RuntimeEnvironment.getApplication(), dataStore)
            .userPreferencesFlow
            .first()

        assertTrue(reloaded.buyerIdentityDemoEnabled)
        assertFalse(reloaded.checkoutPreloadingEnabled)
        assertEquals(CheckoutPresentationMode.AppOwnedComposeSheet, reloaded.checkoutPresentationMode)
        assertFalse(reloaded.dragToDismissEnabled)
        assertFalse(reloaded.tapAwayToDismissEnabled)
        assertEquals(WindowOpenHandler.CustomTabs, reloaded.windowOpenHandler)
        assertEquals(CheckoutSheetPreset.LegacyDialog, reloaded.checkoutSheetPreset)
    }

    @Test
    fun `falls back to defaults for invalid stored enum values`() = runBlocking {
        dataStore.edit {
            it[stringPreferencesKey("checkoutPresentationMode")] = "unsupported"
            it[stringPreferencesKey("windowOpenHandler")] = "unsupported"
            it[stringPreferencesKey("checkoutSheetStyle")] = "unsupported"
            it[stringPreferencesKey("appearance")] = "not-json"
        }

        val settings = preferences.userPreferencesFlow.first()

        assertTrue(settings.appearance is com.shopify.checkoutkit.CheckoutAppearance.Storefront)
        assertEquals(CheckoutPresentationMode.CheckoutKitSheet, settings.checkoutPresentationMode)
        assertEquals(WindowOpenHandler.Default, settings.windowOpenHandler)
        assertEquals(CheckoutSheetPreset.NewDefaults, settings.checkoutSheetPreset)
    }
}
