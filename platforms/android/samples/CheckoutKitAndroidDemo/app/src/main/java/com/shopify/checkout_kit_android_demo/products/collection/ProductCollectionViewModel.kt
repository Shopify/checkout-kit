package com.shopify.checkout_kit_android_demo.products.collection

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.navigation.NavController
import com.shopify.checkout_kit_android_demo.R
import com.shopify.checkout_kit_android_demo.common.ID
import com.shopify.checkout_kit_android_demo.common.SnackbarController
import com.shopify.checkout_kit_android_demo.common.SnackbarEvent
import com.shopify.checkout_kit_android_demo.common.navigation.Screen
import com.shopify.checkout_kit_android_demo.products.collection.data.ProductCollection
import com.shopify.checkout_kit_android_demo.products.collection.data.ProductCollectionRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import java.net.URLEncoder

class ProductCollectionViewModel(
    private val productCollectionRepository: ProductCollectionRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow<ProductCollectionUIState>(ProductCollectionUIState.Loading)
    val uiState: StateFlow<ProductCollectionUIState> = _uiState.asStateFlow()

    fun fetchCollection(handle: String) = viewModelScope.launch {
        Timber.i("Fetching collection with handle: $handle")
        try {
            productCollectionRepository.observeProductCollection(handle, numberOfProducts = 10).collect { collection ->
                Timber.i("Fetching collection emitted")
                _uiState.value = ProductCollectionUIState.Loaded(productCollection = collection)
            }
        } catch (e: Exception) {
            Timber.e("Fetching collection failed $e")
            SnackbarController.sendEvent(SnackbarEvent(R.string.collection_failed_to_load))
            if (_uiState.value !is ProductCollectionUIState.Loaded) {
                _uiState.value = ProductCollectionUIState.Error("Failed to fetch collection")
            }
        }
    }

    fun productSelected(navController: NavController, productId: ID) {
        Timber.i("Product $productId selected, navigation to product page")
        val encodedId = URLEncoder.encode(productId.id, "UTF-8")
        navController.navigate(Screen.Product.route.replace("{productId}", encodedId))
    }
}

sealed class ProductCollectionUIState {
    data object Loading : ProductCollectionUIState()
    data class Error(val error: String) : ProductCollectionUIState()
    data class Loaded(val productCollection: ProductCollection) : ProductCollectionUIState()
}
