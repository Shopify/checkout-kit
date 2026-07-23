package com.shopify.checkout_kit_android_demo.settings.authentication.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.time.Instant

private const val ACCESS_TOKEN_EXPIRATION_SKEW_SECONDS = 60L

/**
 * Internal data model for Customer Accounts API
 */
@Serializable
data class AccessToken(
    @SerialName("access_token")
    val accessToken: String,

    @SerialName("refresh_token")
    val refreshToken: String? = null,

    @SerialName("token_type")
    val tokenType: String,

    @SerialName("expires_in")
    val expiresIn: Long,

    @SerialName("id_token")
    val idToken: String? = null,

    val expiresAt: Long = Instant.now().plusSeconds(expiresIn).toEpochMilli()
) {
    fun hasExpired(now: Instant = Instant.now()): Boolean {
        return expiresAt <= now.plusSeconds(ACCESS_TOKEN_EXPIRATION_SKEW_SECONDS).toEpochMilli()
    }
}

@Serializable
data class Customer(
    val id: String,
    val imageUrl: String,
    val displayName: String,
    val phoneNumber: CustomerPhoneNumber?,
    val emailAddress: CustomerEmailAddress?,
    val defaultAddress: CustomerAddress?,
)

@Serializable
data class CustomerEmailAddress(
    val emailAddress: String,
    val marketingState: String,
)

@Serializable
data class CustomerPhoneNumber(
    val phoneNumber: String,
    val marketingState: String,
)

@Serializable
data class CustomerAddress(
    val id: String,
    val address1: String?,
    val address2: String?,
    val city: String?,
    val country: String?,
    val province: String?,
    val zoneCode: String?,
    val zip: String?,
    val firstName: String?,
    val lastName: String?,
    val name: String?,
    val phoneNumber: String?,
)
