package com.shopify.checkout_kit_mobile_buy_integration_sample.settings.authentication.data.source.network

import com.shopify.checkout_kit_mobile_buy_integration_sample.settings.authentication.data.AccessToken
import com.shopify.checkout_kit_mobile_buy_integration_sample.settings.authentication.data.Customer
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

/**
 * GraphQL client for interacting with Customer Account API
 *
 * e.g. to perform [customer](https://shopify.dev/docs/api/customer/latest/queries/customer)
 * or [order](https://shopify.dev/docs/api/customer/latest/queries/order) queries.
 */
class CustomerAccountsApiGraphQLClient(
    private val client: OkHttpClient,
    private val json: Json,
    private val baseUrl: String,
) {
    suspend fun getCustomer(accessToken: AccessToken): CustomerResponse {
        val query = """
            query {
                customer {
                    id
                    displayName
                    imageUrl
                    defaultAddress {
                        id,
                        address1
                        address2
                        city
                        country
                        province
                        zoneCode
                        zip
                        firstName
                        lastName
                        name
                        phoneNumber
                        formatted
                    }
                    phoneNumber {
                        phoneNumber
                        marketingState
                    }
                    emailAddress {
                        emailAddress
                        marketingState
                    }
                }
            }
        """

        val jsonBody = JSONObject().apply {
            put("operationName", "Customer")
            put("query", query)
        }

        val requestBody = jsonBody.toString()
            .toRequestBody("application/json; charset=utf-8".toMediaType())

        val request = Request.Builder()
            .url(baseUrl)
            .post(requestBody)
            .addHeader("Content-Type", "application/json")
            .addHeader("Authorization", accessToken.accessToken)
            .build()

        return withContext(Dispatchers.IO) {
            try {
                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful) {
                        val customerResponse = json.decodeFromString<CustomerGraphQLResponse>(
                            response.bodyOrThrow()
                        )
                        CustomerResponse.Success(customerResponse.data.customer)
                    } else {
                        val errorResponse = json.decodeFromString<ErrorResponse>(response.bodyOrThrow())
                        CustomerResponse.Error(errorResponse.errors.joinToString())
                    }
                }
            } catch (e: Exception) {
                CustomerResponse.Error(e.message ?: "Unknown error")
            }
        }
    }
}

sealed class CustomerResponse {
    data class Success(val customer: Customer) : CustomerResponse()
    data class Error(val message: String) : CustomerResponse()
}

@Serializable
data class ErrorResponse(
    val errors: List<Error>
)

@Serializable
data class Error(
    val message: String,
)

@Serializable
data class CustomerGraphQLResponse(
    val data: CustomerData,
)

@Serializable
data class CustomerData(
    val customer: Customer
)
