package com.shopify.checkout_kit_android_demo.common.di

import android.app.Application
import androidx.room.Room
import com.apollographql.apollo.ApolloClient
import com.apollographql.cache.normalized.api.CacheKey
import com.apollographql.cache.normalized.memory.MemoryCacheFactory
import com.shopify.checkout_kit_android_demo.BuildConfig
import com.shopify.checkout_kit_android_demo.cart.CartViewModel
import com.shopify.checkout_kit_android_demo.cart.data.CartRepository
import com.shopify.checkout_kit_android_demo.common.client.StorefrontApiClient
import com.shopify.checkout_kit_android_demo.graphql.cache.Cache.cache
import com.shopify.checkout_kit_android_demo.common.logs.LogDatabase
import com.shopify.checkout_kit_android_demo.common.logs.Logger
import com.shopify.checkout_kit_android_demo.common.logs.MIGRATION_1_2
import com.shopify.checkout_kit_android_demo.common.logs.MIGRATION_2_3
import com.shopify.checkout_kit_android_demo.common.logs.MIGRATION_3_4
import com.shopify.checkout_kit_android_demo.home.HomeViewModel
import com.shopify.checkout_kit_android_demo.logs.LogsViewModel
import com.shopify.checkout_kit_android_demo.products.ProductsViewModel
import com.shopify.checkout_kit_android_demo.products.collection.ProductCollectionViewModel
import com.shopify.checkout_kit_android_demo.products.collection.data.ProductCollectionRepository
import com.shopify.checkout_kit_android_demo.products.product.ProductViewModel
import com.shopify.checkout_kit_android_demo.products.product.data.ProductRepository
import com.shopify.checkout_kit_android_demo.settings.PreferencesManager
import com.shopify.checkout_kit_android_demo.settings.SettingsViewModel
import com.shopify.checkout_kit_android_demo.settings.account.AccountViewModel
import com.shopify.checkout_kit_android_demo.settings.authentication.LoginViewModel
import com.shopify.checkout_kit_android_demo.settings.authentication.data.CustomerRepository
import com.shopify.checkout_kit_android_demo.settings.authentication.data.source.local.CustomerAccessTokenStore
import com.shopify.checkout_kit_android_demo.settings.authentication.data.source.local.TokenAeadProvider
import com.shopify.checkout_kit_android_demo.settings.authentication.data.source.local.TokenCodecProvider
import com.shopify.checkout_kit_android_demo.settings.authentication.data.source.local.customerAccessTokenDataStore
import com.shopify.checkout_kit_android_demo.settings.authentication.data.source.network.CustomerAccountsApiGraphQLClient
import com.shopify.checkout_kit_android_demo.settings.authentication.data.source.network.CustomerAccountsApiRestClient
import com.shopify.checkout_kit_android_demo.settings.authentication.utils.AuthenticationHelper
import com.shopify.checkout_kit_android_demo.settings.data.SettingsRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import org.koin.android.ext.koin.androidApplication
import org.koin.android.ext.koin.androidContext
import org.koin.android.ext.koin.androidLogger
import org.koin.core.context.startKoin
import org.koin.core.module.dsl.singleOf
import org.koin.core.module.dsl.viewModelOf
import org.koin.dsl.module

fun setupDI(application: Application) {
    startKoin {
        androidLogger()
        androidContext(application)
        modules(appModules)
    }
}

val appModules = module {
    // App-wide components
    singleOf(::PreferencesManager)

    // Serialization
    single { Json { ignoreUnknownKeys = true } }

    // Storage for customer access tokens
    single<TokenCodecProvider> { TokenAeadProvider(androidApplication().applicationContext) }
    single {
        CustomerAccessTokenStore(
            json = get(),
            tokenCodecProvider = get(),
            dataStore = androidApplication().applicationContext.customerAccessTokenDataStore,
        )
    }

    // Logs
    single { Logger(logDb = get(), coroutineScope = CoroutineScope(Dispatchers.IO)) }
    single {
        Room.databaseBuilder(get(), LogDatabase::class.java, "log-db")
            .addMigrations(MIGRATION_1_2, MIGRATION_2_3, MIGRATION_3_4)
            .build()
    }

    // API Clients
    single {
        ApolloClient.Builder()
            .serverUrl("https://${BuildConfig.storefrontDomain}/api/${BuildConfig.storefrontApiVersion}/graphql.json")
            .cache(
                normalizedCacheFactory = MemoryCacheFactory(maxSizeBytes = 10 * 1024 * 1024),
                keyScope = CacheKey.Scope.SERVICE,
            )
            .addHttpHeader("X-Shopify-Storefront-Access-Token", BuildConfig.storefrontAccessToken)
            .build()
    }
    singleOf(::StorefrontApiClient)
    single {
        CustomerAccountsApiRestClient(
            client = OkHttpClient(),
            json = get(),
            helper = get(),
            redirectUri = BuildConfig.customerAccountApiRedirectUri,
            clientId = BuildConfig.customerAccountApiClientId
        )
    }
    single {
        CustomerAccountsApiGraphQLClient(
            client = OkHttpClient(),
            json = get(),
            baseUrl = BuildConfig.customerAccountApiGraphQLBaseUrl,
        )
    }

    single {
        AuthenticationHelper(
            baseUrl = BuildConfig.customerAccountApiAuthBaseUrl,
            redirectUri = BuildConfig.customerAccountApiRedirectUri,
            clientId = BuildConfig.customerAccountApiClientId
        )
    }

    // Repositories
    singleOf(::CartRepository)
    singleOf(::ProductRepository)
    singleOf(::ProductCollectionRepository)
    singleOf(::CustomerRepository)
    singleOf(::SettingsRepository)

    // Compose view models
    viewModelOf(::SettingsViewModel)
    viewModelOf(::ProductCollectionViewModel)
    viewModelOf(::ProductViewModel)
    viewModelOf(::ProductsViewModel)
    viewModelOf(::HomeViewModel)
    viewModelOf(::LogsViewModel)
    viewModelOf(::LoginViewModel)
    viewModelOf(::AccountViewModel)
    single {
        // singleton instance of shared cart view model
        CartViewModel(get(), get(), get(), get())
    }
}
