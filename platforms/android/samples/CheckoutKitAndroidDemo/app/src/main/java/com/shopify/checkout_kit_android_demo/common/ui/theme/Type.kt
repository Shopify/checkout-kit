package com.shopify.checkout_kit_android_demo.common.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.sp
import com.shopify.checkout_kit_android_demo.R

val cooperBTFontFamily = FontFamily(
    Font(R.font.cooper_bt_normal_200, FontWeight.Light),
    Font(R.font.cooper_bt_normal_500, FontWeight.Normal),
    Font(R.font.cooper_bt_normal_700, FontWeight.Medium),
    Font(R.font.cooper_bt_normal_900, FontWeight.Bold),
    Font(R.font.cooper_bt_italic_200, FontWeight.Light, FontStyle.Italic),
    Font(R.font.cooper_bt_italic_500, FontWeight.Normal, FontStyle.Italic),
    Font(R.font.cooper_bt_italic_700, FontWeight.Medium, FontStyle.Italic),
    Font(R.font.cooper_bt_italic_900, FontWeight.Bold, FontStyle.Italic),
)

val typography = Typography(
    titleLarge = TextStyle(
        fontFamily = cooperBTFontFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 52.sp,
        textAlign = TextAlign.Center,
    ),
    titleMedium = TextStyle(
        fontFamily = cooperBTFontFamily,
        fontSize = 28.sp,
        fontWeight = FontWeight.Normal,
    ),
    titleSmall = TextStyle(
        fontFamily = cooperBTFontFamily,
        fontSize = 22.sp,
        fontWeight = FontWeight.Normal,
    ),
    bodyMedium = TextStyle(
        fontFamily = cooperBTFontFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp
    ),
    bodySmall = TextStyle(
        fontFamily = cooperBTFontFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 10.sp
    )
)
