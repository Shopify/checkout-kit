package com.shopify.checkoutkit.androiddemo.common.navigation

import androidx.navigation.NavBackStackEntry
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
            return route.replace(
                "{collectionHandle}",
                URLEncoder.encode(collectionHandle, StandardCharsets.UTF_8.name())
            )
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
                else -> throw IllegalArgumentException("Unknown route: $route")
            }
        }
    }
}
