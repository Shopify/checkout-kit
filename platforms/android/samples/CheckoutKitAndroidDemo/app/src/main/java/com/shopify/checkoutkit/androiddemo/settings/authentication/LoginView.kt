package com.shopify.checkoutkit.androiddemo.settings.authentication

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.intl.Locale
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.shopify.checkoutkit.androiddemo.R
import com.shopify.checkoutkit.androiddemo.common.components.BodyMedium
import com.shopify.checkoutkit.androiddemo.common.components.ProgressIndicator
import com.shopify.checkoutkit.androiddemo.common.navigation.Screen
import org.koin.androidx.compose.koinViewModel

@Composable
fun LoginView(
    navController: NavController,
    loginViewModel: LoginViewModel = koinViewModel(),
) {

    val uiState = loginViewModel.uiState.collectAsState().value
    val browserAuthenticationLauncher = LocalBrowserAuthenticationLauncher.current
    val locale = Locale.current.toString()

    LaunchedEffect(Unit) {
        // Check if the buyer is already logged in
        loginViewModel.checkLoginState(locale)
    }

    Column {
        when (uiState.status) {
            is Status.Loading -> {
                ProgressIndicator()
            }

            is Status.LoggedOut -> {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier
                        .padding(horizontal = 15.dp, vertical = 20.dp)
                        .fillMaxWidth(),
                ) {
                    Button(
                        onClick = {
                            browserAuthenticationLauncher.launch(uiState.status.authorizationContext.browserRequest) { result ->
                                loginViewModel.browserAuthenticationCompleted(result)
                            }
                        },
                    ) {
                        BodyMedium(
                            text = stringResource(id = R.string.login),
                            color = androidx.compose.material3.MaterialTheme.colorScheme.onPrimary,
                        )
                    }
                }
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
                    BodyMedium(text = stringResource(id = R.string.login_error))
                    Button(onClick = { loginViewModel.checkLoginState(locale) }) {
                        BodyMedium(
                            text = stringResource(id = R.string.login_retry),
                            color = androidx.compose.material3.MaterialTheme.colorScheme.onPrimary,
                        )
                    }
                }
            }
        }
    }
}
