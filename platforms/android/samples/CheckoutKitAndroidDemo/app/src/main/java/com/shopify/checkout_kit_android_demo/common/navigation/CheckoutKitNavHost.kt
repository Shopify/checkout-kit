package com.shopify.checkout_kit_android_demo.common.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavBackStackEntry
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.shopify.checkout_kit_android_demo.cart.CartView
import com.shopify.checkout_kit_android_demo.cart.CartViewModel
import com.shopify.checkout_kit_android_demo.home.HomeView
import com.shopify.checkout_kit_android_demo.logs.LogsView
import com.shopify.checkout_kit_android_demo.logs.LogsViewModel
import com.shopify.checkout_kit_android_demo.products.ProductsView
import com.shopify.checkout_kit_android_demo.products.collection.ProductCollectionView
import com.shopify.checkout_kit_android_demo.products.product.ProductView
import com.shopify.checkout_kit_android_demo.settings.SettingsView
import com.shopify.checkout_kit_android_demo.settings.SettingsViewModel
import com.shopify.checkout_kit_android_demo.settings.account.AccountView
import com.shopify.checkout_kit_android_demo.settings.authentication.LoginView
import java.net.URLEncoder
import java.nio.charset.StandardCharsets

sealed class Screen(val route: String) {
    data object Home : Screen("home")
    data object Product : Screen("product/{productId}") {
        fun productIdRouteVariable(backStackEntry: NavBackStackEntry): String {
            return backStackEntry.arguments?.getString("productId") ?: ""
        }

        fun route(productId: String): String {
            return route.replace("{productId}", URLEncoder.encode(productId, StandardCharsets.UTF_8.name()))
        }
    }

    data object Products : Screen("product")
    data object ProductCollection : Screen("collection/{collectionHandle}") {
        fun collectionHandleRouteVariable(backStackEntry: NavBackStackEntry): String {
            return backStackEntry.arguments?.getString("collectionHandle") ?: ""
        }

        fun route(collectionHandle: String): String {
            return route.replace("{collectionHandle}", URLEncoder.encode(collectionHandle, StandardCharsets.UTF_8.name()))
        }
    }

    data object Cart : Screen("cart")
    data object Settings : Screen("settings")
    data object Logs : Screen("logs")
    data object Login : Screen("login")
    data object Account : Screen("account")

    companion object {
        fun fromRoute(route: String): Screen {
            return when (route) {
                Home.route -> Home
                ProductCollection.route -> ProductCollection
                Product.route -> Product
                Products.route -> Products
                Cart.route -> Cart
                Settings.route -> Settings
                Logs.route -> Logs
                Login.route -> Login
                Account.route -> Account
                else -> throw RuntimeException("Unknown route")
            }
        }
    }
}

@Composable
fun CheckoutKitNavHost(
    navController: NavHostController = rememberNavController(),
    startDestination: String,
    cartViewModel: CartViewModel,
    settingsViewModel: SettingsViewModel,
    logsViewModel: LogsViewModel,
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
