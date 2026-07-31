package com.shopify.checkout_kit_android_demo.e2e

import com.shopify.checkout_kit_android_demo.cart.CartViewModel
import com.shopify.checkout_kit_android_demo.common.ID
import com.shopify.checkout_kit_android_demo.common.navigation.Screen
import com.shopify.checkout_kit_android_demo.products.product.data.ProductRepository
import com.shopify.checkout_kit_android_demo.settings.PreferencesManager
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.suspendCancellableCoroutine
import org.koin.core.component.KoinComponent
import org.koin.core.component.inject
import timber.log.Timber
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

class E2ESampleAppTarget : E2ECommandTarget, KoinComponent {
    private val cartViewModel: CartViewModel by inject()
    private val preferencesManager: PreferencesManager by inject()
    private val productRepository: ProductRepository by inject()

    override suspend fun selectBuyerIdentityMode(mode: E2EBuyerIdentityMode) {
        val enabled = mode == E2EBuyerIdentityMode.HARDCODED

        preferencesManager.setBuyerIdentityDemoEnabled(enabled)
        preferencesManager.userPreferencesFlow.first { it.buyerIdentityDemoEnabled == enabled }
    }

    override suspend fun resetCart() {
        cartViewModel.clearCart()
    }

    override suspend fun variantId(atProductIndex: Int): String {
        val products = productRepository
            .getProducts(numProducts = atProductIndex + 1, numVariants = 1, cursor = null)
            .products

        val variantId = products.getOrNull(atProductIndex)?.variants?.firstOrNull()?.id

        return variantId?.id ?: throw IllegalStateException("No product at index $atProductIndex")
    }

    override suspend fun addCartLine(variantId: String, quantity: Int) {
        suspendCancellableCoroutine { continuation ->
            cartViewModel.addToCart(ID(variantId), quantity) { result ->
                result
                    .onSuccess { continuation.resume(Unit) }
                    .onFailure { continuation.resumeWithException(it) }
            }
        }
    }

    override suspend fun showCart() {
        E2ENavigation.go(Screen.Cart)
    }

    override suspend fun presentSignIn() {
        E2ENavigation.go(Screen.Login)
    }

    override suspend fun report(failure: String) {
        Timber.e("[E2E] $failure")
    }
}
