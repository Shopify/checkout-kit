package com.shopify.checkoutkit

import org.assertj.core.api.AbstractAssert

class CheckoutExceptionAssert(actual: CheckoutException) :
    AbstractAssert<CheckoutExceptionAssert, CheckoutException>(actual, CheckoutExceptionAssert::class.java) {
    companion object {
        fun assertThat(actual: CheckoutException): CheckoutExceptionAssert {
            return CheckoutExceptionAssert(actual)
        }
    }

    fun hasDescription(description: String): CheckoutExceptionAssert {
        isNotNull()

        if (actual.errorDescription != description) {
            failWithMessage(
                "Expected exception to have description <%s>, but was, <%s>",
                description,
                actual.errorDescription
            )
        }

        return this
    }

    fun hasErrorCode(errorCode: String): CheckoutExceptionAssert {
        isNotNull()

        if (actual.errorCode != errorCode) {
            failWithMessage("Expected exception to have errorCode <%s>, but was, <%s>", errorCode, actual.errorCode)
        }

        return this
    }

    fun hasStatusCode(statusCode: Int): CheckoutExceptionAssert {
        isNotNull()

        if (actual !is HttpException) {
            failWithMessage("Cannot assert status code on an exception that is not a HttpException")
        }

        val actualCode = (actual as HttpException).statusCode
        if (actualCode != statusCode) {
            failWithMessage("Expected exception to have statusCode <%s>, but was, <%s>", statusCode, actualCode)
        }

        return this
    }
}

fun noopDefaultCheckoutListener(): DefaultCheckoutListener {
    return object : DefaultCheckoutListener() {
        override fun onCheckoutFailed(error: CheckoutException) {
            // no-op
        }

        override fun onCheckoutDismissed() {
            // no-op
        }
    }
}
