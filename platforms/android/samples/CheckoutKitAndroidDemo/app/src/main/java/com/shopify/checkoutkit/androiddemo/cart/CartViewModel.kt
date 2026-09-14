package com.shopify.checkoutkit.androiddemo.cart

import android.content.ActivityNotFoundException
import android.content.Intent
import androidx.activity.ComponentActivity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.navigation.NavController
import com.shopify.checkoutkit.CheckoutErrorCode
import com.shopify.checkoutkit.CheckoutException
import com.shopify.checkoutkit.CheckoutLink
import com.shopify.checkoutkit.CheckoutLinkAction
import com.shopify.checkoutkit.CheckoutPresentation
import com.shopify.checkoutkit.PreloadState
import com.shopify.checkoutkit.ShopifyCheckoutKit
import com.shopify.checkoutkit.androiddemo.BuildConfig
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
import com.shopify.checkoutkit.androiddemo.e2e.PreloadCacheHitLog
import com.shopify.checkoutkit.androiddemo.e2e.PreloadCacheHitMarker
import com.shopify.checkoutkit.androiddemo.e2e.PreloadStateMarker
import com.shopify.checkoutkit.androiddemo.settings.PreferencesManager
import com.shopify.checkoutkit.androiddemo.settings.authentication.data.AuthenticationState
import com.shopify.checkoutkit.androiddemo.settings.authentication.data.CustomerRepository
import com.shopify.checkoutkit.androiddemo.settings.data.CheckoutPresentationMode
import com.shopify.checkoutkit.androiddemo.settings.data.WindowOpenHandler
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
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

    private val _preloadState = MutableStateFlow<PreloadState>(PreloadState.Idle)
    private val _preloadStateTestId = MutableStateFlow(PreloadStateMarker.testId(PreloadState.Idle))
    val preloadStateTestId: StateFlow<String> = _preloadStateTestId.asStateFlow()

    // The SDK's log sink is internal, so the cache hit is observed from this process's own
    // Logcat and republished as an identifier. Gate the hit when the log arrives so an entry
    // consumed while still loading cannot later count as a ready cache hit.
    private val preloadCacheHitLog = PreloadCacheHitLog(
        isPreloadReady = { _preloadState.value is PreloadState.Ready }
    ).also {
        if (BuildConfig.DEBUG) it.start(viewModelScope)
    }
    val preloadCacheHitTestId: StateFlow<String> = preloadCacheHitLog.observed
        .map { PreloadCacheHitMarker.testId(it) }
        .stateIn(
            viewModelScope,
            SharingStarted.Eagerly,
            PreloadCacheHitMarker.testId(false)
        )

    private var demoBuyerIdentityEnabled = false
    private var checkoutPreloadingEnabled = true
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
        // A cart's buyer identity is fixed when it is created. Discard carts and preloaded
        // checkout state whenever Customer Account authentication changes.
        viewModelScope.launch {
            customerRepository.authenticationState
                .filter { it != AuthenticationState.Loading }
                .distinctUntilChanged()
                .drop(1)
                .collect {
                    clearCart()
                }
        }
    }

    fun addToCart(
        variantId: ID,
        quantity: Int,
        sellingPlanId: String? = null,
        onComplete: OnComplete,
    ) {
        Timber.i("Adding variant: $variantId to cart with quantity: $quantity")
        when (val state = _cartState.value) {
            is CartState.Empty -> performCartCreate(variantId, quantity, sellingPlanId, onComplete)
            is CartState.Cart -> performCartLinesAdd(state.cartID, variantId, quantity, sellingPlanId, onComplete)
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
            configureCheckout(this, activity, navController)
        }
    }

    internal fun configureCheckout(
        presentation: CheckoutPresentation,
        activity: ComponentActivity,
        navController: NavController,
        dismissPresentation: () -> Unit = {},
    ): Unit = with(presentation) {
        val sampleActivity = activity as? MainActivity
        val linkHandler = windowOpenHandler
        onStart { event ->
            recordSdkEvent("Checkout started", event.checkout)
        }
        onUpdate { event ->
            recordSdkEvent("Checkout updated", event.checkout)
        }
        onComplete { event ->
            recordSdkEvent("Checkout completed", event.checkout)
            handleCheckoutCompleted(navController)
        }
        onFail { event ->
            dismissPresentation()
            handleCheckoutFailed(event.error)
        }
        onDismiss {
            dismissPresentation()
            handleCheckoutDismissed()
        }
        onLinkClick { link ->
            handleCheckoutLink(link, activity, linkHandler)
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
    }

    fun checkoutDismissedByHost() {
        handleCheckoutDismissed()
    }

    fun preloadCheckout(url: String, activity: ComponentActivity) {
        if (!checkoutPreloadingEnabled) return

        Timber.i("Preloading checkout")
        ShopifyCheckoutKit.preload(url, activity) { state ->
            Timber.i("Preload state changed to $state")
            _preloadState.value = state
            _preloadStateTestId.value = PreloadStateMarker.testId(state)
        }
    }

    override fun onCleared() {
        preloadCacheHitLog.close()
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

    private fun handleCheckoutLink(
        link: CheckoutLink,
        activity: ComponentActivity,
        handler: WindowOpenHandler,
    ): CheckoutLinkAction {
        // Returning Open keeps Checkout Kit's Custom Tab and non-web intent handling.
        if (handler == WindowOpenHandler.Default) return CheckoutLinkAction.Open

        recordSdkEvent("Checkout link clicked", mapOf("url" to link.url.toString()))
        return try {
            val intent = Intent(Intent.ACTION_VIEW, link.url).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            activity.startActivity(intent)
            recordSdkEvent("Checkout link handled", mapOf("url" to link.url.toString()))
            CheckoutLinkAction.Handled
        } catch (e: ActivityNotFoundException) {
            Timber.w(e, "No activity resolved URL")
            recordLinkCancellation(link, "no activity resolved URL")
            CheckoutLinkAction.Cancel
        } catch (e: SecurityException) {
            Timber.w(e, "External app launch blocked")
            recordLinkCancellation(link, "external app launch blocked")
            CheckoutLinkAction.Cancel
        }
    }

    private fun recordLinkCancellation(link: CheckoutLink, reason: String) {
        recordSdkEvent(
            "Checkout link cancelled",
            mapOf("url" to link.url.toString(), "reason" to reason),
            LogLevel.ERROR,
        )
    }

    private inline fun <reified T> recordSdkEvent(
        message: String,
        payload: T,
        level: LogLevel = LogLevel.INFO,
    ) {
        val serializedPayload = runCatching { Json.encodeToString(payload) }
            .getOrElse {
                Timber.w(it, "Couldn't serialize $message payload")
                payload.toString()
            }
        logger.logSdkEvent(message, serializedPayload, level)
        when (level) {
            LogLevel.INFO -> Timber.i("SDK $message: $serializedPayload")
            LogLevel.ERROR -> Timber.e("SDK $message: $serializedPayload")
        }
    }

    private fun performCartLinesAdd(
        cartId: ID,
        variantId: ID,
        quantity: Int,
        sellingPlanId: String?,
        onComplete: OnComplete,
    ) = viewModelScope.launch {
        Timber.i("Adding cart lines to existing cart: $cartId, variant: $variantId, and $quantity")
        try {
            val cart = cartRepository.addCartLine(cartId, variantId, quantity, sellingPlanId)
            _cartState.value = cart
            onComplete(Result.success(cart))
        } catch (e: Exception) {
            Timber.e("Couldn't add cart line $e")
            SnackbarController.sendEvent(SnackbarEvent(R.string.cart_error_updating))
            onComplete(Result.failure(e))
        }
    }

    private fun performCartCreate(
        variantId: ID,
        quantity: Int,
        sellingPlanId: String?,
        onComplete: OnComplete,
    ) = viewModelScope.launch {
        Timber.i("No existing cart, creating a new one")
        val customerAccessToken = customerRepository.getCustomerAccessToken()?.accessToken
        try {
            val cart = cartRepository.createCart(
                variantId,
                quantity,
                sellingPlanId,
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
