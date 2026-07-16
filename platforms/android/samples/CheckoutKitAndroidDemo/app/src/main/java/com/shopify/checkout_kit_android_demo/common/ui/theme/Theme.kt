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

private val lightTertiaryColor = Color(0xFF7A4E00)
private val darkTertiaryColor = Color(0xFFFFB95C)
private val darkBackgroundColor = Color(0xFF1D1D1F)

private val DarkColorPalette = darkColorScheme(
    background = darkBackgroundColor,
    primary = primaryColor,
    onPrimary = Color.White,
    tertiary = darkTertiaryColor,
    onTertiary = Color(0xFF442B00),
    tertiaryContainer = Color(0xFF5D3A00),
    onTertiaryContainer = Color(0xFFFFE0B2),
    onBackground = Color.White,
)

private val LightColorPalette = lightColorScheme(
    background = Color.White,
    onBackground = Color.Black,
    primary = primaryColor,
    onPrimary = Color.White,
    secondary = secondaryColor,
    tertiary = lightTertiaryColor,
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFFFFE0B2),
    onTertiaryContainer = Color(0xFF281800),
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
