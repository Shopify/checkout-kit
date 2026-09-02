package com.shopify.checkoutkit.androiddemo.common.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.shopify.checkoutkit.androiddemo.cart.CartView
import com.shopify.checkoutkit.androiddemo.cart.CartViewModel
import com.shopify.checkoutkit.androiddemo.home.HomeView
import com.shopify.checkoutkit.androiddemo.logs.LogsView
import com.shopify.checkoutkit.androiddemo.logs.LogsViewModel
import com.shopify.checkoutkit.androiddemo.products.ProductsView
import com.shopify.checkoutkit.androiddemo.products.collection.ProductCollectionView
import com.shopify.checkoutkit.androiddemo.products.product.ProductView
import com.shopify.checkoutkit.androiddemo.settings.SettingsView
import com.shopify.checkoutkit.androiddemo.settings.SettingsViewModel
import com.shopify.checkoutkit.androiddemo.settings.account.AccountView
import com.shopify.checkoutkit.androiddemo.settings.authentication.LoginView
@Composable
fun CheckoutKitNavHost(
    navController: NavHostController = rememberNavController(),
    startDestination: String,
    cartViewModel: CartViewModel,
    settingsViewModel: SettingsViewModel,
    logsViewModel: LogsViewModel,
    onPresentAppOwnedCheckout: (String) -> Unit,
) {
    NavHost(
        navController = navController,
        startDestination = startDestination,
    ) {
        composable(Screen.Home.route) {
            HomeView(navController)
        }

        composable(Screen.Products.route) {
            ProductsView(navController)
        }

        composable(Screen.Product.route) { backStackEntry ->
            ProductView(Screen.Product.productIdRouteVariable(backStackEntry))
        }

        composable(Screen.ProductCollection.route) { backStackEntry ->
            ProductCollectionView(navController, Screen.ProductCollection.collectionHandleRouteVariable(backStackEntry))
        }

        composable(Screen.Cart.route) {
            CartView(
                cartViewModel = cartViewModel,
                navController = navController,
                onPresentAppOwnedCheckout = onPresentAppOwnedCheckout,
            )
        }

        composable(Screen.Settings.route) {
            SettingsView(
                settingsViewModel = settingsViewModel,
                navController = navController
            )
        }

        composable(Screen.Logs.route) {
            LogsView(
                logsViewModel = logsViewModel,
            )
        }

        composable(Screen.Login.route) {
            LoginView(navController = navController)
        }

        composable(Screen.Account.route) {
            AccountView(
                navController = navController
            )
        }
    }
}
