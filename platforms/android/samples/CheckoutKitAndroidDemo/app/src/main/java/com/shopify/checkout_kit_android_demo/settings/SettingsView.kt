package com.shopify.checkout_kit_android_demo.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.activity.compose.LocalActivity
import androidx.navigation.NavHostController
import com.shopify.checkout_kit_android_demo.R
import com.shopify.checkout_kit_android_demo.MainActivity
import com.shopify.checkout_kit_android_demo.common.ObserveAsEvents
import com.shopify.checkout_kit_android_demo.common.components.BodyMedium
import com.shopify.checkout_kit_android_demo.common.components.Header2
import com.shopify.checkout_kit_android_demo.common.components.ProgressIndicator
import com.shopify.checkout_kit_android_demo.common.navigation.Screen
import com.shopify.checkout_kit_android_demo.common.ui.theme.horizontalPadding
import com.shopify.checkout_kit_android_demo.common.ui.theme.verticalPadding

@Composable
fun SettingsView(
    settingsViewModel: SettingsViewModel,
    navController: NavHostController,
) {
    val activity = LocalActivity.current as MainActivity
    ObserveAsEvents(settingsViewModel.logoutRequests) { request ->
        activity.launchCustomerAccountAuthentication(request, settingsViewModel::browserLogoutCompleted)
    }

    when (val uiState = settingsViewModel.uiState.collectAsState().value) {
        is SettingsUiState.Loading -> {
            ProgressIndicator()
        }

        is SettingsUiState.Loaded -> {
            Column(
                modifier = Modifier
                    .padding(horizontal = horizontalPadding, vertical = verticalPadding)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                Row(
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Header2(text = stringResource(id = R.string.settings))
                    if (uiState.isAuthenticated) {
                        BodyMedium(
                            text = stringResource(id = R.string.logout),
                            color = MaterialTheme.colorScheme.onBackground,
                            modifier = Modifier.clickable { settingsViewModel.logout() },
                            textDecoration = TextDecoration.Underline,
                        )
                    } else {
                        BodyMedium(
                            text = stringResource(id = R.string.login),
                            color = MaterialTheme.colorScheme.onBackground,
                            modifier = Modifier.clickable {
                                navController.navigate(Screen.Login.route)
                            },
                            textDecoration = TextDecoration.Underline,
                        )
                    }
                }
                Column {
                    if (uiState.isAuthenticated) {
                        TextButton(
                            contentPadding = PaddingValues(0.dp),
                            onClick = { navController.navigate(Screen.Account.route) },
                            shape = RectangleShape
                        ) {
                            BodyMedium(
                                text = stringResource(id = R.string.settings_account_details),
                                color = Color.Blue,
                                textDecoration = TextDecoration.Underline
                            )
                        }
                    }

                    BuyerIdentityDemoSwitch(
                        checked = uiState.settings.buyerIdentityDemoEnabled,
                        onCheckedChange = settingsViewModel::setBuyerIdentityDemoEnabled,
                        modifier = Modifier
                            .background(color = MaterialTheme.colorScheme.background)
                            .fillMaxWidth()
                    )

                    SettingsSwitch(
                        label = stringResource(id = R.string.checkout_preloading),
                        checked = uiState.settings.checkoutPreloadingEnabled,
                        onCheckedChange = settingsViewModel::setCheckoutPreloadingEnabled,
                        modifier = Modifier
                            .background(color = MaterialTheme.colorScheme.background)
                            .fillMaxWidth()
                    )

                }

                AppearanceSection(
                    selected = uiState.settings.appearance,
                    setSelected = settingsViewModel::setAppearance
                )

                CheckoutPresentationModeSection(
                    selected = uiState.settings.checkoutPresentationMode,
                    checkoutSheetPreset = uiState.settings.checkoutSheetPreset,
                    dragToDismissEnabled = uiState.settings.dragToDismissEnabled,
                    tapAwayToDismissEnabled = uiState.settings.tapAwayToDismissEnabled,
                    setSelected = settingsViewModel::setCheckoutPresentationMode,
                    setCheckoutSheetPreset = settingsViewModel::setCheckoutSheetPreset,
                    setDragToDismissEnabled = settingsViewModel::setDragToDismissEnabled,
                    setTapAwayToDismissEnabled = settingsViewModel::setTapAwayToDismissEnabled,
                )

                WindowOpenHandlerSection(
                    selected = uiState.settings.windowOpenHandler,
                    setSelected = settingsViewModel::setWindowOpenHandler
                )

                Version(
                    title = stringResource(id = R.string.sdk_version),
                    version = uiState.sdkVersion,
                    modifier = Modifier.fillMaxWidth()
                )

                Version(
                    title = stringResource(id = R.string.sample_app_version),
                    version = uiState.sampleAppVersion,
                    modifier = Modifier.fillMaxWidth()
                )

                Button(
                    onClick = { navController.navigate(Screen.Logs.route) },
                    shape = RectangleShape,
                ) {
                    BodyMedium(
                        text = stringResource(id = R.string.view_logs),
                        color = MaterialTheme.colorScheme.onPrimary,
                    )
                }
            }
        }
    }
}
