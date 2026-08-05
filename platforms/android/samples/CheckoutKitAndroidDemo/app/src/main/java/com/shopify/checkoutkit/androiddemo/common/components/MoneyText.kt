package com.shopify.checkoutkit.androiddemo.common.components

import android.content.Context
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextAlign
import com.shopify.checkoutkit.androiddemo.R
import java.util.Locale

@Composable
fun MoneyText(
    currency: String,
    price: Double,
    modifier: Modifier = Modifier,
    style: TextStyle = MaterialTheme.typography.bodyMedium,
    color: Color = MaterialTheme.colorScheme.onBackground,
    textAlign: TextAlign = TextAlign.Start,
    includeSuffix: Boolean = true,
) {
    val locale = LocalConfiguration.current.locales.get(0)

    Text(
        modifier = modifier,
        style = style,
        color = color,
        textAlign = textAlign,
        text = toDisplayText(
            LocalContext.current,
            currency,
            price,
            locale,
            includeSuffix,
        )
    )
}

@Composable
fun MoneyRangeText(
    fromPrice: Double,
    fromCurrencyCode: String,
    toPrice: Double,
    toCurrencyCode: String,
    modifier: Modifier = Modifier,
    style: TextStyle = MaterialTheme.typography.bodyMedium,
    color: Color = MaterialTheme.colorScheme.onBackground,
    textAlign: TextAlign = TextAlign.Start,
    includeSuffix: Boolean = true,
) {
    val locale = LocalConfiguration.current.locales.get(0)

    Text(
        modifier = modifier,
        style = style,
        color = color,
        textAlign = textAlign,
        text = toDisplayText(
            LocalContext.current,
            fromPrice,
            fromCurrencyCode,
            toPrice,
            toCurrencyCode,
            locale,
            includeSuffix,
        )
    )
}

private fun toDisplayText(context: Context, currencyCode: String, price: Double, locale: Locale, includeSuffix: Boolean): String {
    if (price == 0.0) {
        return context.resources.getString(R.string.free)
    }

    return price.toTwoDecimalPlaceString(context, locale, currencyCode, includeSuffix)
}

private fun toDisplayText(
    context: Context,
    fromPrice: Double,
    fromCurrencyCode: String,
    toPrice: Double,
    toCurrencyCode: String,
    locale: Locale,
    includeSuffix: Boolean
): String {
    if (fromPrice == toPrice && fromCurrencyCode == toCurrencyCode) {
        return toDisplayText(context, toCurrencyCode, toPrice, locale, includeSuffix)
    }

    val fromPriceString = fromPrice.toTwoDecimalPlaceString(context, locale, fromCurrencyCode, includeSuffix)
    val toPriceString = toPrice.toTwoDecimalPlaceString(context, locale, toCurrencyCode, includeSuffix)

    return "$fromPriceString - $toPriceString"
}

private fun Double.toTwoDecimalPlaceString(
    context: Context,
    locale: Locale,
    currencyCode: String,
    includeSuffix: Boolean,
): String {
    if (this == 0.0) {
        return context.resources.getString(R.string.free)
    } else {
        val displayText = "${currencyCode.toSymbol()}${this.toTwoDecimalString(locale)}"
        if (includeSuffix) {
            return "$displayText $currencyCode"
        }
        return displayText
    }
}

private fun String.toSymbol(): String {
    return when (this) {
        "GBP" -> "£"
        "USD", "CAD" -> "$"
        "EUR" -> "€"
        else -> {
            "$this "
        }
    }
}

private fun Double.toTwoDecimalString(locale: Locale) =
    String.format(locale, "%,.2f", this)
