package com.shopify.checkout_kit_android_demo.e2e

interface E2ECommandTarget {
    suspend fun selectBuyerIdentityMode(mode: E2EBuyerIdentityMode)

    suspend fun resetCart()

    suspend fun variantId(atProductIndex: Int): String

    suspend fun addCartLine(variantId: String, quantity: Int)

    suspend fun showCart()

    suspend fun report(failure: String)
}

class E2EController(private val target: E2ECommandTarget) {

    suspend fun handle(url: String): Boolean {
        val link = try {
            E2EControlLink.parse(url)
        } catch (error: IllegalArgumentException) {
            target.report(message(error))
            return true
        }

        if (link == null) {
            return false
        }

        perform(link)

        return true
    }

    private suspend fun perform(link: E2EControlLink) {
        try {
            when (link) {
                is E2EControlLink.Reset -> target.resetCart()
                is E2EControlLink.Cart -> seedCart(link)
                is E2EControlLink.SignIn -> throw UnsupportedOperationException("signIn is not implemented yet")
            }
        } catch (error: Exception) {
            target.report(message(error))
        }
    }

    private suspend fun seedCart(command: E2EControlLink.Cart) {
        command.buyerIdentityMode?.let { target.selectBuyerIdentityMode(it) }

        target.resetCart()

        val variantId = command.variantId ?: target.variantId(command.productIndex ?: 0)

        target.addCartLine(variantId, command.quantity)
        target.showCart()
    }

    private fun message(error: Throwable) = error.message ?: error.toString()
}
