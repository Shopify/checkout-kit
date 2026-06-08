package com.shopify.checkout_kit_android_demo.settings.authentication

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.intl.Locale
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.shopify.checkout_kit_android_demo.R
import com.shopify.checkout_kit_android_demo.common.components.BodyMedium
import com.shopify.checkout_kit_android_demo.common.components.ProgressIndicator
import com.shopify.checkout_kit_android_demo.common.navigation.Screen
import org.koin.androidx.compose.koinViewModel

@Composable
fun LoginView(
    navController: NavController,
    loginViewModel: LoginViewModel = koinViewModel(),
) {

    val uiState = loginViewModel.uiState.collectAsState().value

    LaunchedEffect(key1 = true) {
        // Check if the buyer is already logged in
        loginViewModel.checkLoginState(Locale.current)
    }

    Column {
        when (uiState.status) {
            is Status.Loading -> {
                ProgressIndicator()
            }

            is Status.LoggedOut -> {
                // Show the login WebView if not yet logged in
                LoginWebView(
                    url = uiState.status.loginUrl,
                    customerAccountApiRedirectUri = uiState.status.redirectUri,
                    onCodeParamIntercepted = { code: String ->
                        loginViewModel.codeParamIntercepted(code)
                    }
                )
            }

            is Status.LoggedIn -> {
                // Navigate back to settings when login is complete
                navController.navigate(Screen.Settings.route)
            }

            is Status.Error -> {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(20.dp),
                    modifier = Modifier
                        .padding(horizontal = 15.dp, vertical = 20.dp)
                        .fillMaxWidth(),
                ) {
                    // A retry mechanism should be added for this case
                    BodyMedium(text = stringResource(id = R.string.login_error))
                }
            }
        }
    }
}
