package com.shopify.checkoutkit.androiddemo.cart

import android.content.ActivityNotFoundException
import android.content.Intent
import androidx.activity.ComponentActivity
import androidx.core.net.toUri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.navigation.NavController
import com.shopify.checkoutkit.CheckoutErrorCode
import com.shopify.checkoutkit.CheckoutException
import com.shopify.checkoutkit.CheckoutPreload
import com.shopify.checkoutkit.CheckoutPresentation
import com.shopify.checkoutkit.CheckoutProtocol
import com.shopify.checkoutkit.ShopifyCheckoutKit
import com.shopify.checkoutkit.androiddemo.MainActivity
import com.shopify.checkoutkit.androiddemo.R
import com.shopify.checkoutkit.androiddemo.cart.data.CartRepository
import com.shopify.checkoutkit.androiddemo.cart.data.CartState
import com.shopify.checkoutkit.androiddemo.common.ID
import com.shopify.checkoutkit.androiddemo.common.SnackbarController
import com.shopify.checkoutkit.androiddemo.common.SnackbarEvent
import com.shopify.checkoutkit.androiddemo.common.logs.LogLevel
import com.shopify.checkoutkit.androiddemo.common.logs.Logger
import com.shopify.checkoutkit.androiddemo.common.navigation.Screen
import com.shopify.checkoutkit.androiddemo.settings.PreferencesManager
import com.shopify.checkoutkit.androiddemo.settings.authentication.data.CustomerRepository
import com.shopify.checkoutkit.androiddemo.settings.data.CheckoutPresentationMode
import com.shopify.checkoutkit.androiddemo.settings.data.WindowOpenHandler
import com.shopify.ucp.embedded.checkout.WindowOpenResult
import com.shopify.ucp.embedded.checkout.windowOpenRejected
import com.shopify.ucp.embedded.checkout.windowOpenSuccess
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
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

    private val _checkoutPresentationMode = MutableStateFlow(CheckoutPresentationMode.CheckoutKitSheet)
    val checkoutPresentationMode: StateFlow<CheckoutPresentationMode> = _checkoutPresentationMode.asStateFlow()

    private var demoBuyerIdentityEnabled = false
    private var checkoutPreloadingEnabled = true
    private var checkoutPreload: CheckoutPreload? = null
    private var windowOpenHandler = WindowOpenHandler.Default

    init {
        // clear cart when buyer identity demo setting toggled
        viewModelScope.launch {
            preferencesManager.userPreferencesFlow.collect {
                if (demoBuyerIdentityEnabled != it.buyerIdentityDemoEnabled) {
                    clearCart()
                    demoBuyerIdentityEnabled = it.buyerIdentityDemoEnabled
                }
                checkoutPreloadingEnabled = it.checkoutPreloadingEnabled
                _checkoutPresentationMode.value = it.checkoutPresentationMode
                windowOpenHandler = it.windowOpenHandler
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
        ShopifyCheckoutKit.invalidate()
        _cartState.value = CartState.Empty
    }

    fun presentCheckout(
        url: String,
        activity: ComponentActivity,
        navController: NavController,
    ) {
        Timber.i("Presenting checkout")
        ShopifyCheckoutKit.present(
            checkoutUrl = url,
            context = activity,
        ) {
            configureCheckout(activity, navController)
        }
    }

    private fun CheckoutPresentation.configureCheckout(
        activity: ComponentActivity,
        navController: NavController,
    ) {
        val sampleActivity = activity as? MainActivity
        onFail(::handleCheckoutFailed)
        onDismiss {
            handleCheckoutDismissed()
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
        connect(buildProtocolClient(navController, activity))
    }

    fun checkoutDismissedByHost() {
        handleCheckoutDismissed()
    }

    fun preloadCheckout(url: String, activity: ComponentActivity) {
        if (!checkoutPreloadingEnabled) return

        Timber.i("Preloading checkout")
        ShopifyCheckoutKit.invalidate()
        checkoutPreload = ShopifyCheckoutKit.preload(url, activity) { state ->
            Timber.i("Preload state changed to $state")
        }
    }

    fun continueShopping(navController: NavController) {
        Timber.i("Continue shopping clicked, navigating to products")
        navController.navigate(Screen.Products.route)
    }

    private fun handleCheckoutCompleted(navController: NavController) {
        clearCart()
        viewModelScope.launch(Dispatchers.Main.immediate) {
            navController.popBackStack(Screen.Product.route, false)
        }
    }

    internal fun handleCheckoutFailed(error: CheckoutException) {
        logger.logSdkError("Checkout failed", error)

        // Checkout Kit has ended its presentation. The host owns recovery: only cart-terminal
        // failures discard local cart state; other failures retain it so the buyer can retry.
        if (error.code in cartReplacementErrorCodes) {
            clearCart()
        }

        viewModelScope.launch {
            SnackbarController.sendEvent(SnackbarEvent(error.userMessageResourceId()))
        }
    }

    private fun CheckoutException.userMessageResourceId(): Int = when (code) {
        CheckoutErrorCode.CART_EXPIRED,
        CheckoutErrorCode.CART_COMPLETED,
        CheckoutErrorCode.INVALID_CART,
        -> R.string.checkout_error_cart_unavailable

        CheckoutErrorCode.CUSTOMER_ACCOUNT_REQUIRED -> R.string.checkout_error_customer_account_required
        CheckoutErrorCode.STOREFRONT_PASSWORD_REQUIRED -> R.string.checkout_error_storefront_password_required
        CheckoutErrorCode.NETWORK_ERROR,
        CheckoutErrorCode.WEB_CONTENT_PROCESS_TERMINATED,
        -> R.string.checkout_error_retry

        CheckoutErrorCode.WEB_VIEW_NOT_SUPPORTED -> R.string.checkout_error_web_view_not_supported
        CheckoutErrorCode.HTTP_ERROR -> if (httpStatusCode.isRetryableCheckoutHttpStatus()) {
            R.string.checkout_error_retry
        } else {
            R.string.checkout_error
        }

        CheckoutErrorCode.SDK_ERROR,
        CheckoutErrorCode.UNKNOWN,
        -> R.string.checkout_error
    }

    private fun Int?.isRetryableCheckoutHttpStatus(): Boolean =
        this == HTTP_STATUS_REQUEST_TIMEOUT ||
            this == HTTP_STATUS_TOO_MANY_REQUESTS ||
            (this != null && this in HTTP_STATUS_SERVER_ERROR_RANGE)

    private companion object {
        const val HTTP_STATUS_REQUEST_TIMEOUT = 408
        const val HTTP_STATUS_TOO_MANY_REQUESTS = 429
        val HTTP_STATUS_SERVER_ERROR_RANGE = 500..599

        val cartReplacementErrorCodes = setOf(
            CheckoutErrorCode.CART_EXPIRED,
            CheckoutErrorCode.CART_COMPLETED,
            CheckoutErrorCode.INVALID_CART,
        )
    }

    internal fun handleCheckoutDismissed() {
        logger.logSdkEvent("Checkout dismissed")
    }

    internal fun buildProtocolClient(
        navController: NavController,
        activity: ComponentActivity,
    ): CheckoutProtocol.Client {
        val base = CheckoutProtocol.Client()
            .on(CheckoutProtocol.start) { checkout ->
                recordReceivedProtocolMessage(CheckoutProtocol.start.method, checkout)
            }
            .on(CheckoutProtocol.complete) { checkout ->
                recordReceivedProtocolMessage(CheckoutProtocol.complete.method, checkout)
                handleCheckoutCompleted(navController)
            }
            .on(CheckoutProtocol.error) { error ->
                recordReceivedProtocolMessage(CheckoutProtocol.error.method, error, LogLevel.ERROR)
            }
            .on(CheckoutProtocol.totalsChange) { checkout ->
                recordReceivedProtocolMessage(CheckoutProtocol.totalsChange.method, checkout)
            }
            .on(CheckoutProtocol.lineItemsChange) { checkout ->
                recordReceivedProtocolMessage(CheckoutProtocol.lineItemsChange.method, checkout)
            }
            .on(CheckoutProtocol.messagesChange) { checkout ->
                recordReceivedProtocolMessage(CheckoutProtocol.messagesChange.method, checkout)
            }
            .on(CheckoutProtocol.fulfillmentChange) { checkout ->
                recordReceivedProtocolMessage(CheckoutProtocol.fulfillmentChange.method, checkout)
            }

        return when (windowOpenHandler) {
            // With no sample handler registered, Checkout Kit retains its default Custom Tab handling.
            WindowOpenHandler.Default -> base
            WindowOpenHandler.ExternalApp -> base.on(CheckoutProtocol.windowOpen) { request ->
                recordReceivedProtocolMessage(CheckoutProtocol.windowOpen.method, request)
                val uri = request.url.toUri()
                Timber.i("ECP ec.window.open_request (${uri.scheme}) → external app")
                try {
                    val intent = Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    activity.startActivity(intent)
                    windowOpenSuccess().also {
                        recordWindowOpenResponse("success", it)
                    }
                } catch (e: ActivityNotFoundException) {
                    Timber.w(e, "No activity resolved URL")
                    windowOpenRejected(reason = "no activity resolved URL").also {
                        recordWindowOpenResponse("rejected", it)
                    }
                }
            }
        }
    }

    private inline fun <reified T> recordReceivedProtocolMessage(
        method: String,
        payload: T,
        level: LogLevel = LogLevel.INFO,
    ) {
        recordProtocolMessage("Received: $method", payload, level)
    }

    private fun recordWindowOpenResponse(outcome: String, payload: WindowOpenResult) {
        val level = if (outcome == "success") LogLevel.INFO else LogLevel.ERROR
        recordProtocolMessage("Sent: ${CheckoutProtocol.windowOpen.method} response ($outcome)", payload, level)
    }

    private inline fun <reified T> recordProtocolMessage(
        message: String,
        payload: T,
        level: LogLevel,
    ) {
        val serializedPayload = runCatching { Json.encodeToString(payload) }
            .getOrElse {
                Timber.w(it, "Couldn't serialize $message payload")
                payload.toString()
            }
        logger.logProtocolMessage(message, serializedPayload, level)
        when (level) {
            LogLevel.INFO -> Timber.i("ECP $message: $serializedPayload")
            LogLevel.ERROR -> Timber.e("ECP $message: $serializedPayload")
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
