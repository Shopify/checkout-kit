package com.shopify.checkout_kit_android_demo

import android.net.Uri
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.testTagsAsResourceId
import androidx.compose.ui.unit.dp
import androidx.navigation.compose.rememberNavController
import com.shopify.checkout_kit_android_demo.cart.CartBootstrapException
import com.shopify.checkout_kit_android_demo.cart.CartBootstrapLink
import com.shopify.checkout_kit_android_demo.cart.CartViewModel
import com.shopify.checkout_kit_android_demo.cart.data.totalQuantity
import com.shopify.checkout_kit_android_demo.common.ID
import com.shopify.checkout_kit_android_demo.common.ObserveAsEvents
import com.shopify.checkout_kit_android_demo.common.SnackbarController
import com.shopify.checkout_kit_android_demo.common.SnackbarEvent
import com.shopify.checkout_kit_android_demo.common.navigation.BottomAppBarWithNavigation
import com.shopify.checkout_kit_android_demo.common.navigation.CheckoutKitNavHost
import com.shopify.checkout_kit_android_demo.common.navigation.Screen
import com.shopify.checkout_kit_android_demo.common.ui.theme.CheckoutKitSampleTheme
import com.shopify.checkout_kit_android_demo.logs.LogsViewModel
import com.shopify.checkout_kit_android_demo.products.product.data.ProductRepository
import com.shopify.checkout_kit_android_demo.settings.SettingsUiState
import com.shopify.checkout_kit_android_demo.settings.SettingsViewModel
import com.shopify.checkoutkit.ColorScheme
import kotlinx.coroutines.launch
import org.koin.androidx.compose.koinViewModel
import org.koin.compose.koinInject

@Composable
fun CheckoutKitApp(
    cartBootstrapUri: Uri? = null,
    onCartBootstrapHandled: () -> Unit = {},
) {
    val settingsViewModel = koinViewModel<SettingsViewModel>()
    val cartViewModel = koinViewModel<CartViewModel>()
    val logsViewModel = koinViewModel<LogsViewModel>()
    val productRepository = koinInject<ProductRepository>()

    CheckoutKitAppRoot(
        settingsViewModel = settingsViewModel,
        cartViewModel = cartViewModel,
        logsViewModel = logsViewModel,
        productRepository = productRepository,
        cartBootstrapUri = cartBootstrapUri,
        onCartBootstrapHandled = onCartBootstrapHandled,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CheckoutKitAppRoot(
    settingsViewModel: SettingsViewModel,
    cartViewModel: CartViewModel,
    logsViewModel: LogsViewModel,
    productRepository: ProductRepository,
    cartBootstrapUri: Uri?,
    onCartBootstrapHandled: () -> Unit,
) {
    val useDarkTheme = settingsViewModel.uiState.collectAsState().value
        .isDarkTheme(isSystemInDarkTheme())

    val cartState = cartViewModel.cartState.collectAsState()
    val totalQuantity = cartState.value.totalQuantity
    val context = LocalContext.current

    CheckoutKitSampleTheme(darkTheme = useDarkTheme) {
        Surface(
            modifier = Modifier
                .fillMaxSize()
                .testTag("checkout-kit-sample-ready")
                .semantics {
                    testTagsAsResourceId = true
                },
        ) {
            val navController = rememberNavController()
            var currentScreen by remember { mutableStateOf<Screen>(Screen.Product) }
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

            LaunchedEffect(cartBootstrapUri) {
                val uri = cartBootstrapUri ?: return@LaunchedEffect

                try {
                    val cartBootstrapLink = CartBootstrapLink.parse(uri) ?: return@LaunchedEffect
                    val variantId = variantIdFor(cartBootstrapLink, productRepository)

                    cartViewModel.seedCart(variantId, cartBootstrapLink.quantity) { result ->
                        result.onSuccess {
                            navController.navigate(Screen.Cart.route)
                        }
                    }
                } catch (e: Exception) {
                    SnackbarController.sendEvent(SnackbarEvent(R.string.cart_bootstrap_failed))
                } finally {
                    onCartBootstrapHandled()
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
                            IconButton(
                                modifier = Modifier.testTag("cart-tab"),
                                onClick = {
                                    navController.navigate(Screen.Cart.route)
                                }
                            ) {
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
                    )
                }
            }
        }
    }
}

private suspend fun variantIdFor(
    cartBootstrapLink: CartBootstrapLink,
    productRepository: ProductRepository,
): ID {
    cartBootstrapLink.variantId?.let { return it }

    val productIndex = cartBootstrapLink.productIndex
        ?: throw CartBootstrapException("Missing variantId or productIndex")
    val product = productRepository
        .getProducts(numProducts = productIndex + 1, numVariants = 1, cursor = null)
        .products
        .getOrNull(productIndex)
    val variant = product?.variants?.firstOrNull()
        ?: throw CartBootstrapException("Cart bootstrap product variant was not found")

    return variant.id
}

data class AppBarState(
    val actions: @Composable RowScope.() -> Unit = {},
)

private fun SettingsUiState.isDarkTheme(isSystemInDarkTheme: Boolean) = when (this) {
    is SettingsUiState.Loading -> isSystemInDarkTheme
    is SettingsUiState.Loaded -> {
        when (settings.colorScheme) {
            is ColorScheme.Dark -> true
            is ColorScheme.Light, is ColorScheme.Web -> false
            is ColorScheme.Automatic -> isSystemInDarkTheme
        }
    }
}
