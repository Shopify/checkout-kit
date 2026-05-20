/*
 * MIT License
 *
 * Copyright 2023-present, Shopify Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
package com.shopify.checkout_kit_mobile_buy_integration_sample.cart

import android.content.ActivityNotFoundException
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.browser.customtabs.CustomTabsIntent
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.navigation.NavController
import com.shopify.checkout_kit_mobile_buy_integration_sample.MainActivity
import com.shopify.checkout_kit_mobile_buy_integration_sample.R
import com.shopify.checkout_kit_mobile_buy_integration_sample.cart.data.CartRepository
import com.shopify.checkout_kit_mobile_buy_integration_sample.cart.data.CartState
import com.shopify.checkout_kit_mobile_buy_integration_sample.common.ID
import com.shopify.checkout_kit_mobile_buy_integration_sample.common.SnackbarController
import com.shopify.checkout_kit_mobile_buy_integration_sample.common.SnackbarEvent
import com.shopify.checkout_kit_mobile_buy_integration_sample.common.logs.Logger
import com.shopify.checkout_kit_mobile_buy_integration_sample.common.navigation.Screen
import com.shopify.checkout_kit_mobile_buy_integration_sample.settings.PreferencesManager
import com.shopify.checkout_kit_mobile_buy_integration_sample.settings.authentication.data.CustomerRepository
import com.shopify.checkoutkit.Checkout
import com.shopify.checkoutkit.CheckoutProtocol
import com.shopify.checkoutkit.CheckoutException
import com.shopify.checkoutkit.ShopifyCheckoutKit
import com.shopify.checkoutkit.WindowOpenResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import timber.log.Timber

typealias OnComplete = (Result<CartState.Cart>) -> Unit

class CartViewModel(
    private val cartRepository: CartRepository,
    private val preferencesManager: PreferencesManager,
    private val customerRepository: CustomerRepository,
    private val logger: Logger,
) : ViewModel() {

    private val _cartState = MutableStateFlow<CartState>(CartState.Empty)
    val cartState: StateFlow<CartState> = _cartState.asStateFlow()

    private val _loadingState = MutableStateFlow(false)
    val loadingState: StateFlow<Boolean> = _loadingState

    private var demoBuyerIdentityEnabled = false

    init {
        // clear cart when buyer identity demo setting toggled
        viewModelScope.launch {
            preferencesManager.userPreferencesFlow.collect {
                if (demoBuyerIdentityEnabled != it.buyerIdentityDemoEnabled) {
                    clearCart()
                    demoBuyerIdentityEnabled = it.buyerIdentityDemoEnabled
                }
            }
        }
    }

    fun addToCart(variantId: ID, quantity: Int, onComplete: OnComplete) {
        Timber.i("Adding variant: $variantId to cart with quantity: $quantity")
        when (val state = _cartState.value) {
            is CartState.Empty -> performCartCreate(variantId, quantity, onComplete)
            is CartState.Cart -> performCartLinesAdd(state.cartID, variantId, quantity, onComplete)
        }
    }

    fun modifyLineItem(lineItemId: ID, quantity: Int?) = viewModelScope.launch {
        when (val state = _cartState.value) {
            is CartState.Cart -> {
                Timber.i("Updating or removing line item: $lineItemId, quantity: $quantity")
                _loadingState.value = true
                try {
                    val cart = cartRepository.modifyCartLine(state.cartID, lineItemId, quantity)
                    Timber.i("Cart modification complete")
                    _cartState.value = if (cart.cartTotals.totalQuantity == 0) CartState.Empty else cart
                    _loadingState.value = false
                } catch (e: Exception) {
                    Timber.e("Error updating cart $e")
                    SnackbarController.sendEvent(SnackbarEvent(R.string.cart_error_updating))
                    _loadingState.value = false
                }
            }

            is CartState.Empty -> Timber.e("attempting to update the quantity on an empty cart")
        }
    }

    fun clearCart() {
        _cartState.value = CartState.Empty
    }

    fun presentCheckout(
        url: String,
        activity: ComponentActivity,
        navController: NavController,
    ) {
        Timber.i("Presenting checkout with $url")
        val sampleActivity = activity as? MainActivity
        ShopifyCheckoutKit.present(url, activity) {
            onFail { error ->
                handleCheckoutFailed(error, activity)
            }
            onCancel {
                handleCheckoutCanceled()
            }
            sampleActivity?.let { mainActivity ->
                onShowFileChooser { _, filePathCallback, fileChooserParams ->
                    mainActivity.onShowFileChooser(filePathCallback, fileChooserParams)
                }
                onGeolocationPermissionsShowPrompt { origin, callback ->
                    mainActivity.onGeolocationPermissionsShowPrompt(origin, callback)
                }
                onGeolocationPermissionsHidePrompt {
                    mainActivity.onGeolocationPermissionsHidePrompt()
                }
            }
            connect(buildCommunicationClient(navController, activity))
        }
    }

    fun continueShopping(navController: NavController) {
        Timber.i("Continue shopping clicked, navigating to products")
        navController.navigate(Screen.Products.route)
    }

    private fun handleCheckoutCompleted(
        checkout: Checkout,
        navController: NavController,
    ) {
        logger.log(checkout)
        clearCart()
        viewModelScope.launch(Dispatchers.Main.immediate) {
            navController.popBackStack(Screen.Product.route, false)
        }
    }

    private fun handleCheckoutFailed(
        error: CheckoutException,
        activity: ComponentActivity,
    ) {
        logger.log("Checkout failed", error)
        clearCart()
        viewModelScope.launch(Dispatchers.Main.immediate) {
            Toast.makeText(
                activity,
                activity.getText(R.string.checkout_error),
                Toast.LENGTH_SHORT,
            ).show()
        }
    }

    private fun handleCheckoutCanceled() {
        logger.log("Checkout canceled")
    }

    private fun buildCommunicationClient(
        navController: NavController,
        activity: ComponentActivity,
    ): CheckoutProtocol.Client =
        CheckoutProtocol.Client()
            .on(CheckoutProtocol.start) { Timber.i("ECP ec.start: $it") }
            .on(CheckoutProtocol.complete) { checkout ->
                Timber.i("ECP ec.complete: $checkout")
                handleCheckoutCompleted(checkout, navController)
            }
            .on(CheckoutProtocol.error) { Timber.i("ECP ec.error: $it") }
            .on(CheckoutProtocol.totalsChange) { Timber.i("ECP ec.totals.change: $it") }
            .on(CheckoutProtocol.lineItemsChange) { Timber.i("ECP ec.line_items.change: $it") }
            .on(CheckoutProtocol.messagesChange) { Timber.i("ECP ec.messages.change: $it") }
            .on(CheckoutProtocol.windowOpen) { request ->
                val scheme = request.url.scheme?.lowercase()
                Timber.i("ECP ec.window.open_request ($scheme): ${request.url}")
                if (scheme != "http" && scheme != "https") {
                    WindowOpenResult.Rejected(reason = "unsupported URL scheme: $scheme")
                } else {
                    try {
                        CustomTabsIntent.Builder().build().launchUrl(activity, request.url)
                        WindowOpenResult.Success
                    } catch (e: ActivityNotFoundException) {
                        Timber.w(e, "No activity resolved ${request.url}")
                        WindowOpenResult.Rejected(reason = "no activity resolved URL")
                    }
                }
            }

    private fun performCartLinesAdd(cartId: ID, variantId: ID, quantity: Int, onComplete: OnComplete) = viewModelScope.launch {
        Timber.i("Adding cart lines to existing cart: $cartId, variant: $variantId, and $quantity")
        try {
            val cart = cartRepository.addCartLine(cartId, variantId, quantity)
            _cartState.value = cart
            onComplete(Result.success(cart))
        } catch (e: Exception) {
            Timber.e("Couldn't add cart line $e")
            SnackbarController.sendEvent(SnackbarEvent(R.string.cart_error_updating))
            onComplete(Result.failure(e))
        }
    }

    private fun performCartCreate(variantId: ID, quantity: Int, onComplete: OnComplete) = viewModelScope.launch {
        Timber.i("No existing cart, creating a new one")
        val customerAccessToken = customerRepository.getCustomerAccessToken()?.accessToken
        try {
            val cart = cartRepository.createCart(
                variantId,
                quantity,
                demoBuyerIdentityEnabled,
                customerAccessToken,
            )

            Timber.i("Cart created $cart")
            _cartState.value = cart
            onComplete(Result.success(cart))
        } catch (e: Exception) {
            Timber.e("Couldn't create cart $e")
            SnackbarController.sendEvent(SnackbarEvent(R.string.cart_error_creating))
            onComplete(Result.failure(e))
        }
    }
}
