package com.shopify.checkout_kit_android_demo.common.navigation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.material3.BottomAppBar
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.res.vectorResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.shopify.checkout_kit_android_demo.R
import com.shopify.checkout_kit_android_demo.common.components.BodySmall

@Composable
fun BottomAppBarWithNavigation(
    navController: NavHostController,
    currentScreen: Screen,
) {
    BottomAppBar(
        containerColor = MaterialTheme.colorScheme.background,
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            NavigationItem(
                navController,
                Screen.Home,
                ImageVector.vectorResource(R.drawable.home),
                stringResource(id = R.string.navigation_home),
                currentScreen,
                "home-tab",
            )
            NavigationItem(
                navController,
                Screen.Products,
                ImageVector.vectorResource(R.drawable.product),
                stringResource(id = R.string.navigation_shop),
                currentScreen,
                "products-tab",
            )
            NavigationItem(
                navController,
                Screen.Settings,
                ImageVector.vectorResource(R.drawable.profile),
                stringResource(id = R.string.navigation_log_in),
                currentScreen,
                "settings-tab",
            )
        }
    }
}

@Composable
fun NavigationItem(
    navController: NavHostController,
    screen: Screen,
    icon: ImageVector,
    label: String,
    currentScreen: Screen,
    testTag: String,
) {
    val isActiveScreen = currentScreen == screen
    val color = if (isActiveScreen) {
        MaterialTheme.colorScheme.primary
    } else {
        MaterialTheme.colorScheme.outline
    }

    Column {
        IconButton(
            onClick = { navController.navigate(screen.route) },
            modifier = Modifier
                .testTag(testTag)
                .semantics {
                    this.contentDescription = "$label icon"
                }
        ) {
            Icon(imageVector = icon, contentDescription = label, tint = color)
        }

        BodySmall(
            text = label,
            color = color,
            modifier = Modifier
                .align(Alignment.CenterHorizontally)
                .offset(0.dp, (-7.5).dp)
        )
    }
}
