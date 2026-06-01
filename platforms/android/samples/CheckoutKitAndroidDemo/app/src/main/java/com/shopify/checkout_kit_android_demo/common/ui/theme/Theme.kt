package com.shopify.checkout_kit_android_demo.common.ui.theme

import androidx.activity.ComponentActivity
import androidx.activity.compose.LocalActivity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat

val horizontalPadding = 15.dp
val verticalPadding = 20.dp
val largeScreenBreakpoint = 600.dp
val defaultProductImageHeight = 250.dp
val defaultProductImageHeightLg = 500.dp

private val primaryColor = Color(
    red = 37 / 255.0f,
    green = 96 / 255.0f,
    blue = 79 / 255.0f,
    alpha = 1.0f
)

private val secondaryColor = Color(
    red = 37 / 255.0f,
    green = 41 / 255.0f,
    blue = 46 / 255.0f,
    alpha = 1.0f
)

private val DarkColorPalette = darkColorScheme(
    primary = primaryColor,
    onPrimary = Color.White,
    onBackground = Color.White,
)

private val LightColorPalette = lightColorScheme(
    background = Color.White,
    onBackground = Color.Black,
    primary = primaryColor,
    onPrimary = Color.White,
    secondary = secondaryColor
)

@Composable
fun CheckoutKitSampleTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colors = if (darkTheme) {
        DarkColorPalette
    } else {
        LightColorPalette
    }

    val view = LocalView.current
    val activity = LocalActivity.current as ComponentActivity

    if (!view.isInEditMode) {
        SideEffect {
            WindowCompat
                .getInsetsController(activity.window, view)
                .isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colors,
        typography = typography,
        shapes = shapes,
        content = content,
    )
}
