package com.shopify.checkout_kit_android_demo.home

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Modifier
import androidx.navigation.NavController
import com.shopify.checkout_kit_android_demo.common.ID
import com.shopify.checkout_kit_android_demo.common.components.ProgressIndicator
import com.shopify.checkout_kit_android_demo.products.collection.ProductCollections
import org.koin.androidx.compose.koinViewModel

@Composable
fun HomeView(
    navController: NavController,
    homeViewModel: HomeViewModel = koinViewModel()
) {

    LaunchedEffect(key1 = true) {
        homeViewModel.fetchHomePageData()
    }

    val homeUiState = homeViewModel.uiState.collectAsState().value

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
    ) {
        if (homeUiState == HomeUIState.Loading) {
            ProgressIndicator()
        }

        Hero(onClickShopAll = { homeViewModel.shopAll(navController) })

        when (homeUiState) {
            is HomeUIState.Loading -> {
                // Do nothing, ProgressIndicator appears above hero
            }

            is HomeUIState.Error -> {
                Text(homeUiState.error)
            }

            is HomeUIState.Loaded -> {
                ProductCollections(
                    productCollections = homeUiState.productCollections,
                    onClick = { collectionHandle -> homeViewModel.productCollectionSelected(navController, collectionHandle) }
                )
                Featured(homeUiState.productCollections.firstOrNull()?.products ?: emptyList()) { productId: ID ->
                    homeViewModel.productSelected(navController, productId)
                }
            }
        }
    }
}
