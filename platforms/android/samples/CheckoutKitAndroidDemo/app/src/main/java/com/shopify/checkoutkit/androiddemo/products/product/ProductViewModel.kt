package com.shopify.checkoutkit.androiddemo.products.product

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shopify.checkoutkit.androiddemo.cart.CartViewModel
import com.shopify.checkoutkit.androiddemo.products.product.data.Product
import com.shopify.checkoutkit.androiddemo.products.product.data.ProductRepository
import com.shopify.checkoutkit.androiddemo.products.product.data.ProductVariant
import com.shopify.checkoutkit.androiddemo.products.product.data.ProductVariantOptionDetails
import com.shopify.checkoutkit.androiddemo.products.product.data.ProductVariantSelectedOption
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
            cartViewModel.addToCart(
                variantId = state.selectedVariant.id,
                quantity = quantity,
                onComplete = { setIsAddingToCart(false) },
                sellingPlanId = state.selectedSellingPlanId,
            )
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
        val selectedVariant = currentState?.selectedVariant?.let { currentVariant ->
            product.variants.find { variant -> variant.id == currentVariant.id }
        } ?: product.variants.first()

        _uiState.value = ProductUIState.Loaded(
            product = product,
            selectedVariant = selectedVariant,
            selectedSellingPlanId = selectedSellingPlanId(product, selectedVariant, currentState?.selectedSellingPlanId),
            availableOptions = buildAvailableOptions(product, selectedVariant),
            isAddingToCart = currentState?.isAddingToCart ?: false,
            addQuantityAmount = currentState?.addQuantityAmount ?: 1
        )
    }

    // Select a new variant option (e.g. size = large)
    fun updateSelectedOption(name: String, value: String) {
        val state = _uiState.value
        if (state is ProductUIState.Loaded) {
            val matchingVariant = state.product.variants.first { variant ->
                variant.selectedOptions.containsAll(newOptions(state.selectedVariant, name, value))
            }
            matchingVariant.let {
                _uiState.value = state.copy(
                    selectedVariant = it,
                    selectedSellingPlanId = selectedSellingPlanId(state.product, it, null),
                    availableOptions = buildAvailableOptions(
                        product = state.product,
                        selectedVariant = it
                    )
                )
            }
        }
    }

    fun selectSellingPlan(sellingPlanId: String?) {
        val state = _uiState.value
        if (state is ProductUIState.Loaded) {
            _uiState.value = state.copy(selectedSellingPlanId = sellingPlanId)
        }
    }

    private fun selectedSellingPlanId(
        product: Product,
        variant: ProductVariant,
        currentSellingPlanId: String?,
    ): String? {
        val hasCurrentPlan = variant.sellingPlanAllocations.any { it.id == currentSellingPlanId }
        return when {
            hasCurrentPlan -> currentSellingPlanId
            product.requiresSellingPlan -> variant.sellingPlanAllocations.firstOrNull()?.id
            else -> null
        }
    }

    // Returns variant options for the product, and whether the option is available for sale (when combined with other options on the
    // currently selected variant) e.g. { "size": [{"large", true}, {"medium", false}], "color": [{"red", true}, {"blue", false}]}
    private fun buildAvailableOptions(
        product: Product,
        selectedVariant: ProductVariant
    ): Map<String, List<ProductVariantOptionDetails>> {
        // Only return available options if more than one option exists
        if (product.variants.size == 1) {
            return emptyMap()
        }

        val options = product.variants
            .flatMap { it.selectedOptions }
            .distinctBy { it.value }

        return options.associateBy(
            { it.name },
            { selectedOption ->
                options.filter { it.name == selectedOption.name }.map { option ->
                    ProductVariantOptionDetails(
                        name = option.value,
                        availableForSale = product.variants.find {
                            it.selectedOptions.containsAll(
                                newOptions(selectedVariant, selectedOption.name, option.value)
                            )
                        }?.availableForSale ?: false,
                    )
                }
            }
        )
    }

    // Modifies the options for the selected variant (e.g: [size: large, color: red]) by replacing one with a new option (e.g. color: blue)
// to return e.g. [size: large, color: blue]
    private fun newOptions(
        selectedVariant: ProductVariant,
        name: String,
        value: String
    ): List<ProductVariantSelectedOption> =
        selectedVariant.selectedOptions
            .filter { it.name != name }
            .plus(ProductVariantSelectedOption(name, value))

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
        val selectedSellingPlanId: String?,
        val availableOptions: Map<String, List<ProductVariantOptionDetails>>,
        val isAddingToCart: Boolean,
        val addQuantityAmount: Int
    ) : ProductUIState()
}
