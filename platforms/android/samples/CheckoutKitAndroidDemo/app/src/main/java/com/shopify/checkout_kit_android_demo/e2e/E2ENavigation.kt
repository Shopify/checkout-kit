package com.shopify.checkout_kit_android_demo.e2e

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.navigation.NavController
import com.shopify.checkout_kit_android_demo.common.navigation.Screen
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow

object E2ENavigation {
    val destinations = MutableSharedFlow<Screen>(
        replay = 1,
        onBufferOverflow = BufferOverflow.DROP_OLDEST,
    )

    suspend fun go(screen: Screen) = destinations.emit(screen)
}

@Composable
fun E2ENavigationEffect(navController: NavController) {
    LaunchedEffect(navController) {
        E2ENavigation.destinations.collect { screen ->
            navController.navigate(screen.route)
        }
    }
}
