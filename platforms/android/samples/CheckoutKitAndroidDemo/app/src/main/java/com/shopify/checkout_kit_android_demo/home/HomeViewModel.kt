package com.shopify.checkout_kit_android_demo.home

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

class HomeViewModel(
    private val productCollectionRepository: ProductCollectionRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow<HomeUIState>(HomeUIState.Loading)
    val uiState: StateFlow<HomeUIState> = _uiState.asStateFlow()

    fun fetchHomePageData() = viewModelScope.launch {
        try {
            Timber.i("Fetching home page data")
            productCollectionRepository.observeProductCollections(
                numberOfCollections = NUM_COLLECTIONS,
                numberOfProductsPerCollection = NUM_PRODUCTS_PER_COLLECTION
            ).collect { collections ->
                Timber.i("Home page data emitted ${collections.size} collections")
                _uiState.value = HomeUIState.Loaded(
                    productCollections = collections,
                )
            }
        } catch (e: Exception) {
            Timber.e("Failed to fetch collections $e")
            SnackbarController.sendEvent(SnackbarEvent(R.string.collections_failed_to_load))
            if (_uiState.value !is HomeUIState.Loaded) {
                _uiState.value = HomeUIState.Error(e.message ?: "Unknown")
            }
        }
    }

    fun shopAll(navController: NavController) {
        Timber.i("Shop all clicked, navigating to products")
        navController.navigate(Screen.Products.route)
    }

    fun productCollectionSelected(navController: NavController, collectionHandle: String) {
        Timber.i("ProductCollection selected, navigating to $collectionHandle")
        navController.navigate(Screen.ProductCollection.route(collectionHandle))
    }

    fun productSelected(navController: NavController, productId: ID) {
        Timber.i("Product selected $productId, navigating to product page")
        navController.navigate(Screen.Product.route(productId.id))
    }

    companion object {
        private const val NUM_COLLECTIONS = 2
        private const val NUM_PRODUCTS_PER_COLLECTION = 8
    }
}

sealed class HomeUIState {
    data object Loading : HomeUIState()
    data class Error(val error: String) : HomeUIState()
    data class Loaded(
        val productCollections: List<ProductCollection>,
    ) : HomeUIState()
}
