package com.shopify.checkoutkit.androiddemo.common.logs

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.util.Date
import java.util.UUID

@Entity
data class LogLine(
    @PrimaryKey val id: UUID = UUID.randomUUID(),
    val createdAt: Long = Date().time,
    val message: String,
    val source: LogSource,
    val level: LogLevel,
    val payload: String? = null,
)

enum class LogSource {
    SDK, PROTOCOL
}

enum class LogLevel {
    INFO, ERROR
}
