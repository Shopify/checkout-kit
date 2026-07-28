package com.shopify.checkoutkit

import org.assertj.core.api.AbstractAssert

class CheckoutExceptionAssert(actual: CheckoutException) :
    AbstractAssert<CheckoutExceptionAssert, CheckoutException>(actual, CheckoutExceptionAssert::class.java) {
    companion object {
        fun assertThat(actual: CheckoutException): CheckoutExceptionAssert = CheckoutExceptionAssert(actual)
    }

    fun hasMessage(message: String): CheckoutExceptionAssert {
        isNotNull()

        if (actual.message != message) {
            failWithMessage("Expected exception message <%s>, but was <%s>", message, actual.message)
        }

        return this
    }

    fun hasCode(code: CheckoutErrorCode): CheckoutExceptionAssert {
        isNotNull()

        if (actual.code != code) {
            failWithMessage("Expected exception code <%s>, but was <%s>", code, actual.code)
        }

        return this
    }

    fun hasHttpStatusCode(statusCode: Int): CheckoutExceptionAssert {
        isNotNull()

        if (actual.httpStatusCode != statusCode) {
            failWithMessage(
                "Expected exception HTTP status code <%s>, but was <%s>",
                statusCode,
                actual.httpStatusCode,
            )
        }

        return this
    }
}

fun noopDefaultCheckoutListener(): DefaultCheckoutListener = object : DefaultCheckoutListener() {
    override fun onCheckoutFailed(error: CheckoutException) {
        // no-op
    }

    override fun onCheckoutDismissed() {
        // no-op
    }
}
