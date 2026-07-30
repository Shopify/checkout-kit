package com.shopify.checkout_kit_android_demo.cart

import androidx.activity.ComponentActivity
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.navigation.NavController
import com.shopify.checkout_kit_android_demo.MainActivity
import com.shopify.checkout_kit_android_demo.R
import com.shopify.checkoutkit.ShopifyCheckout

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun AppOwnedCheckoutSheet(
    checkoutUrl: String,
    activity: ComponentActivity,
    navController: NavController,
    cartViewModel: CartViewModel,
    containerColor: Color,
    onDismiss: () -> Unit,
) {
    val currentOnDismiss by rememberUpdatedState(onDismiss)
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val sampleActivity = activity as? MainActivity

    ModalBottomSheet(
        sheetState = sheetState,
        onDismissRequest = {
            currentOnDismiss()
            cartViewModel.checkoutDismissedByHost()
        },
        containerColor = containerColor,
        dragHandle = { CompactCheckoutDragHandle() },
    ) {
        AndroidView(
            factory = { context ->
                // Create one ShopifyCheckout for this presentation. Its checkout URL, callbacks, and protocol client
                // are fixed at creation, so create a new view when starting a new checkout.
                ShopifyCheckout.create(
                    context = context,
                    checkoutUrl = checkoutUrl,
                ) {
                    onFail { error ->
                        currentOnDismiss()
                        cartViewModel.handleCheckoutFailed(error)
                    }
                    onDismiss {
                        currentOnDismiss()
                        cartViewModel.handleCheckoutDismissed()
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
                    connect(cartViewModel.buildProtocolClient(navController, activity))
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(CHECKOUT_HEIGHT_FRACTION),
            // ShopifyCheckout owns WebView resources. Destroy it when Compose permanently removes the AndroidView.
            onRelease = ShopifyCheckout::destroy,
        )
    }
}

private const val CHECKOUT_HEIGHT_FRACTION = 0.9f

@Composable
private fun CompactCheckoutDragHandle() {
    val dragHandleDescription = stringResource(id = R.string.checkout_sheet_drag_handle_content_description)

    Surface(
        modifier = Modifier
            .padding(vertical = 8.dp)
            .semantics { contentDescription = dragHandleDescription },
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        shape = CircleShape,
    ) {
        Box(Modifier.size(width = 32.dp, height = 4.dp))
    }
}
