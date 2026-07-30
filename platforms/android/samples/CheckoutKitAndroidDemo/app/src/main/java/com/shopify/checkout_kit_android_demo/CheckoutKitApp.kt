package com.shopify.checkout_kit_android_demo

import androidx.activity.ComponentActivity
import androidx.activity.compose.LocalActivity
import androidx.compose.foundation.Image
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.colorResource
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.testTagsAsResourceId
import androidx.compose.ui.unit.dp
import androidx.navigation.compose.rememberNavController
import com.shopify.checkout_kit_android_demo.cart.AppOwnedCheckoutSheet
import com.shopify.checkout_kit_android_demo.cart.CartViewModel
import com.shopify.checkout_kit_android_demo.cart.data.totalQuantity
import com.shopify.checkout_kit_android_demo.common.ObserveAsEvents
import com.shopify.checkout_kit_android_demo.common.SnackbarController
import com.shopify.checkout_kit_android_demo.common.navigation.BottomAppBarWithNavigation
import com.shopify.checkout_kit_android_demo.common.navigation.CheckoutKitNavHost
import com.shopify.checkout_kit_android_demo.common.navigation.Screen
import com.shopify.checkout_kit_android_demo.common.ui.theme.CheckoutKitSampleTheme
import com.shopify.checkout_kit_android_demo.e2e.E2ENavigationEffect
import com.shopify.checkout_kit_android_demo.e2e.E2ETestIds
import com.shopify.checkout_kit_android_demo.logs.LogsViewModel
import com.shopify.checkout_kit_android_demo.settings.SettingsUiState
import com.shopify.checkout_kit_android_demo.settings.SettingsViewModel
import com.shopify.checkoutkit.CheckoutAppearance
import com.shopify.checkoutkit.ColorScheme
import kotlinx.coroutines.launch
import org.koin.androidx.compose.koinViewModel

@Composable
fun CheckoutKitApp() {
    val settingsViewModel = koinViewModel<SettingsViewModel>()
    val cartViewModel = koinViewModel<CartViewModel>()
    val logsViewModel = koinViewModel<LogsViewModel>()

    CheckoutKitAppRoot(settingsViewModel, cartViewModel, logsViewModel)
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalComposeUiApi::class)
@Composable
fun CheckoutKitAppRoot(
    settingsViewModel: SettingsViewModel,
    cartViewModel: CartViewModel,
    logsViewModel: LogsViewModel,
) {
    val settingsUiState = settingsViewModel.uiState.collectAsState().value
    val useDarkTheme = settingsUiState.isDarkTheme(isSystemInDarkTheme())

    val cartState = cartViewModel.cartState.collectAsState()
    val totalQuantity = cartState.value.totalQuantity
    val activity = LocalActivity.current as ComponentActivity
    val context = LocalContext.current

    CheckoutKitSampleTheme(darkTheme = useDarkTheme) {
        val checkoutAppearance = (settingsUiState as? SettingsUiState.Loaded)?.settings?.appearance
        val appOwnedCheckoutContainerColor = when (checkoutAppearance) {
            is CheckoutAppearance.Storefront -> colorResource(id = R.color.header_bg)
            else -> MaterialTheme.colorScheme.background
        }

        Surface(
            modifier = Modifier
                .fillMaxSize()
                .semantics { testTagsAsResourceId = true }
                .testTag(E2ETestIds.APP_READY),
        ) {
            val navController = rememberNavController()

            E2ENavigationEffect(navController)

            var currentScreen by remember { mutableStateOf<Screen>(Screen.Product) }
            var presentedCheckoutUrl by remember { mutableStateOf<String?>(null) }
            val scope = rememberCoroutineScope()
            val snackbarHostState = remember { SnackbarHostState() }

            ObserveAsEvents(flow = SnackbarController.events) { event ->
                scope.launch {
                    snackbarHostState.currentSnackbarData?.dismiss()
                    snackbarHostState.showSnackbar(message = context.resources.getText(event.resourceId).toString())
                }
            }

            LaunchedEffect(navController) {
                navController.currentBackStackEntryFlow.collect { backStackEntry ->
                    backStackEntry.destination.route?.let {
                        currentScreen = Screen.fromRoute(it)
                    }
                }
            }

            Scaffold(
                snackbarHost = {
                    SnackbarHost(hostState = snackbarHostState)
                },
                topBar = {
                    CenterAlignedTopAppBar(
                        modifier = Modifier,
                        colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                            containerColor = MaterialTheme.colorScheme.background
                        ),
                        title = {
                            Image(
                                modifier = Modifier.height(38.dp),
                                contentScale = ContentScale.FillHeight,
                                painter = painterResource(id = R.drawable.logo_vector),
                                contentDescription = stringResource(id = R.string.logo_content_description)
                            )
                        },
                        actions = {
                            IconButton(onClick = {
                                navController.navigate(Screen.Cart.route)
                            }) {
                                BadgedBox(badge = {
                                    if (totalQuantity > 0) {
                                        Badge(
                                            containerColor = MaterialTheme.colorScheme.primary,
                                            contentColor = MaterialTheme.colorScheme.onPrimary,
                                            modifier = Modifier.offset(
                                                x = -(7.5.dp), y = 20.dp
                                            )
                                        ) {
                                            Text("$totalQuantity")
                                        }
                                    }
                                }) {
                                    Icon(
                                        modifier = Modifier.height(48.dp),
                                        painter = painterResource(id = R.drawable.cart),
                                        contentDescription = stringResource(id = R.string.cart_icon_content_description),
                                    )
                                }
                            }
                        },
                    )
                },
                bottomBar = {
                    BottomAppBarWithNavigation(
                        navController,
                        currentScreen,
                    )
                }
            ) {
                Column(Modifier.padding(paddingValues = it)) {
                    CheckoutKitNavHost(
                        navController = navController,
                        startDestination = Screen.Home.route,
                        cartViewModel = cartViewModel,
                        settingsViewModel = settingsViewModel,
                        logsViewModel = logsViewModel,
                        onPresentAppOwnedCheckout = { presentedCheckoutUrl = it },
                    )
                }
            }

            // Keep app-owned checkout above navigation so completion can navigate behind its thank-you page.
            presentedCheckoutUrl?.let { checkoutUrl ->
                AppOwnedCheckoutSheet(
                    checkoutUrl = checkoutUrl,
                    activity = activity,
                    navController = navController,
                    cartViewModel = cartViewModel,
                    containerColor = appOwnedCheckoutContainerColor,
                    onDismiss = { presentedCheckoutUrl = null },
                )
            }
        }
    }
}

data class AppBarState(
    val actions: @Composable RowScope.() -> Unit = {},
)

private fun SettingsUiState.isDarkTheme(isSystemInDarkTheme: Boolean) = when (this) {
    is SettingsUiState.Loading -> isSystemInDarkTheme
    is SettingsUiState.Loaded -> {
        when (settings.colorScheme) {
            is ColorScheme.Dark -> true
            is ColorScheme.Light -> false
            is ColorScheme.Automatic -> isSystemInDarkTheme
        }
    }
}
