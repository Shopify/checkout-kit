package com.shopify.checkout_kit_mobile_buy_integration_sample.common.logs

import androidx.room.ColumnInfo
import androidx.room.Embedded
import androidx.room.Entity
import androidx.room.PrimaryKey
import java.util.Date
import java.util.UUID

@Entity
data class LogLine(
    @PrimaryKey val id: UUID = UUID.randomUUID(),
    val createdAt: Long = Date().time,
    val message: String,
    val type: LogType,
    @Embedded(prefix = "error_details") val errorDetails: ErrorDetails? = null,
    @ColumnInfo(name = "checkout_completedorderDetails") val checkoutCompletedPayload: String? = null,
)

enum class LogType {
    STANDARD, ERROR, CHECKOUT_COMPLETED
}

data class ErrorDetails(
    val type: String?,
    val message: String,
)
