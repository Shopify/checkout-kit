package com.shopify.checkoutkit.androiddemo.products.product

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shopify.checkoutkit.androiddemo.cart.CartViewModel
import com.shopify.checkoutkit.androiddemo.products.product.data.Product
import com.shopify.checkoutkit.androiddemo.products.product.data.ProductRepository
import com.shopify.checkoutkit.androiddemo.products.product.data.ProductVariant
import com.shopify.checkoutkit.androiddemo.products.product.data.ProductVariantOptionDetails
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import timber.log.Timber

class ProductViewModel(
    private val cartViewModel: CartViewModel,
    private val productRepository: ProductRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow<ProductUIState>(ProductUIState.Loading)
    val uiState: StateFlow<ProductUIState> = _uiState.asStateFlow()

    fun setAddQuantityAmount(quantity: Int) {
        val currentState = _uiState.value
        if (currentState is ProductUIState.Loaded) {
            Timber.i("Updating addQuantityAmount to $quantity")
            _uiState.value = currentState.copy(addQuantityAmount = quantity)
        }
    }

    fun addToCart() {
        val state = _uiState.value
        if (state is ProductUIState.Loaded) {
            val quantity = state.addQuantityAmount
            setIsAddingToCart(true)
            cartViewModel.addToCart(state.selectedVariant.id, quantity) {
                setIsAddingToCart(false)
            }
        }
    }

    fun fetchProduct(productId: String) = viewModelScope.launch {
        Timber.i("Fetching product with id $productId")
        try {
            productRepository.observeProduct(productId).collect { product ->
                Timber.i("Fetching product emitted $product")
                updateLoadedProduct(product)
            }
        } catch (e: Exception) {
            Timber.e("Fetching product failed $e")
            if (_uiState.value !is ProductUIState.Loaded) {
                _uiState.value = ProductUIState.Error(e.message ?: "Unknown error")
            }
        }
    }

    private fun updateLoadedProduct(product: Product) {
        val currentState = _uiState.value as? ProductUIState.Loaded
        val selectedVariant = selectedVariantFor(product, currentState?.selectedVariant)

        _uiState.value = ProductUIState.Loaded(
            product = product,
            selectedVariant = selectedVariant,
            availableOptions = availableOptionsFor(product, selectedVariant),
            isAddingToCart = currentState?.isAddingToCart ?: false,
            addQuantityAmount = currentState?.addQuantityAmount ?: 1
        )
    }

    // Select a new variant option (e.g. size = large)
    fun updateSelectedOption(name: String, value: String) {
        val state = _uiState.value
        if (state is ProductUIState.Loaded) {
            variantForOption(state.product, state.selectedVariant, name, value)?.let { matchingVariant ->
                _uiState.value = state.copy(
                    selectedVariant = matchingVariant,
                    availableOptions = availableOptionsFor(
                        product = state.product,
                        selectedVariant = matchingVariant,
                    ),
                )
            }
        }
    }

    private fun setIsAddingToCart(value: Boolean) {
        val currentState = _uiState.value
        if (currentState is ProductUIState.Loaded) {
            Timber.i("isAddingToCart - $value")
            _uiState.value = currentState.copy(isAddingToCart = value)
        }
    }
}

sealed class ProductUIState {
    data object Loading : ProductUIState()
    data class Error(val error: String) : ProductUIState()
    data class Loaded(
        val product: Product,
        val selectedVariant: ProductVariant,
        val availableOptions: Map<String, List<ProductVariantOptionDetails>>,
        val isAddingToCart: Boolean,
        val addQuantityAmount: Int
    ) : ProductUIState()
}
