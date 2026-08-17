package com.shopify.checkoutkit

import java.text.ParsePosition
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone
import kotlin.math.ceil

internal object RetryAfter {
    private const val MILLISECONDS_PER_SECOND = 1_000.0
    private val dateFormats = listOf(
        "EEE, dd MMM yyyy HH:mm:ss zzz",
        "EEEE, dd-MMM-yy HH:mm:ss zzz",
        "EEE MMM d HH:mm:ss yyyy",
    )

    fun seconds(value: String?, nowMillis: Long = System.currentTimeMillis()): Long? {
        val normalized = value?.trim()?.takeIf { it.isNotEmpty() } ?: return null
        val delay = normalized.toLongOrNull()?.takeIf { it >= 0 }
        return delay ?: secondsFromDate(normalized, nowMillis)
    }

    private fun secondsFromDate(value: String, nowMillis: Long): Long? =
        dateFormats.firstNotNullOfOrNull { format ->
            val formatter = SimpleDateFormat(format, Locale.US).apply {
                calendar = Calendar.getInstance(TimeZone.getTimeZone("GMT"), Locale.US)
                timeZone = TimeZone.getTimeZone("GMT")
                isLenient = false
            }
            val position = ParsePosition(0)
            formatter.parse(value, position)
                ?.takeIf { position.index == value.length }
                ?.let { ceil(maxOf(0L, it.time - nowMillis) / MILLISECONDS_PER_SECOND).toLong() }
        }
}
