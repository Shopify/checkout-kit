package com.shopify.checkout_kit_android_demo.logs

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.shopify.checkout_kit_android_demo.R
import com.shopify.checkout_kit_android_demo.common.components.BodyMedium
import com.shopify.checkout_kit_android_demo.common.ui.theme.horizontalPadding
import com.shopify.checkout_kit_android_demo.common.ui.theme.verticalPadding
import com.shopify.checkout_kit_android_demo.logs.details.LogDetailModal

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun LogsView(logsViewModel: LogsViewModel) {
    val logDetailsDialogOpen = remember { mutableStateOf(false) }
    val logDetails = remember { mutableStateOf<PrettyLog?>(null) }

    LaunchedEffect(key1 = true) {
        logsViewModel.readLogs(last = 100)
    }

    if (logDetailsDialogOpen.value) {
        LogDetailModal(
            logLine = logDetails.value?.data,
            previousCheckoutPayload = logDetails.value?.previousCheckoutPayload,
            onDismissRequest = {
                logDetails.value = null
                logDetailsDialogOpen.value = false
            },
        )
    }

    when (val logState = logsViewModel.logState.collectAsState().value) {
        is LogState.Loading -> {
            Text("Logs loading")
        }

        is LogState.Populated -> {
            Column(
                Modifier
                    .fillMaxSize()
                    .padding(horizontal = horizontalPadding, vertical = verticalPadding)
            ) {

                Button(shape = RectangleShape, onClick = {
                    logsViewModel.clear()
                }) {
                    BodyMedium(
                        text = stringResource(id = R.string.delete_logs),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                }

                LazyColumn(Modifier.fillMaxSize()) {
                    stickyHeader {
                        LogOverviewHeader(
                            Modifier
                                .background(MaterialTheme.colorScheme.background)
                                .padding(horizontal = 8.dp, vertical = 8.dp)
                        )
                    }
                    logState.groups.forEach { group ->
                        item(key = "checkout-${group.checkoutId}") {
                            CheckoutLogGroupHeader(
                                checkoutId = group.checkoutId,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(MaterialTheme.colorScheme.surfaceVariant)
                                    .padding(horizontal = 8.dp, vertical = 6.dp),
                            )
                        }
                        itemsIndexed(
                            items = group.logs,
                            key = { _, line -> line.data.id },
                        ) { index, line ->
                            LogOverview(
                                log = line,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(
                                        if (index % 2 == 0) {
                                            MaterialTheme.colorScheme.surface
                                        } else {
                                            MaterialTheme.colorScheme.background
                                        }
                                    )
                                    .padding(horizontal = 8.dp, vertical = 4.dp),
                                onClick = {
                                    logDetails.value = line
                                    logDetailsDialogOpen.value = true
                                },
                            )
                        }
                    }
                }
            }
        }
    }
}

object Logs {
    const val DATE_FORMAT = "dd/MM/yy HH:mm:ss"
    const val DATE_COLUMN_WEIGHT = 0.25f
    const val MESSAGE_COLUMN_WEIGHT = 0.75f
}
