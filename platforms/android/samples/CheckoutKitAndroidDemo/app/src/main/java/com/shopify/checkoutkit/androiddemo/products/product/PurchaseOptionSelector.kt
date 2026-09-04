package com.shopify.checkoutkit.androiddemo.products.product

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.selectable
import androidx.compose.material3.RadioButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import com.shopify.checkoutkit.androiddemo.R
import com.shopify.checkoutkit.androiddemo.common.components.BodySmall
import com.shopify.checkoutkit.androiddemo.products.product.data.SellingPlanAllocation

@Composable
fun PurchaseOptionSelector(
    sellingPlanAllocations: List<SellingPlanAllocation>,
    requiresSellingPlan: Boolean,
    selectedSellingPlanId: String?,
    onSelected: (String?) -> Unit,
) {
    Column {
        BodySmall(stringResource(R.string.product_purchase_option))

        if (!requiresSellingPlan) {
            PurchaseOption(
                name = stringResource(R.string.product_one_time_purchase),
                selected = selectedSellingPlanId == null,
                onClick = { onSelected(null) },
            )
        }

        sellingPlanAllocations.forEach { allocation ->
            PurchaseOption(
                name = allocation.name,
                selected = selectedSellingPlanId == allocation.id,
                onClick = { onSelected(allocation.id) },
            )
        }
    }
}

@Composable
private fun PurchaseOption(name: String, selected: Boolean, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .selectable(
                selected = selected,
                onClick = onClick,
                role = Role.RadioButton,
            )
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        RadioButton(
            selected = selected,
            onClick = null,
        )
        BodySmall(name)
    }
}
