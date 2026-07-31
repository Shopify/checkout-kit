package com.shopify.checkoutkit.androiddemo.e2e

import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.yield
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test

class E2EControllerTest {
    @Test
    fun `ignores links that are not control links`() {
        val target = E2ECommandTargetSpy()

        val handled = runBlocking { E2EController(target).handle("https://example.com/cart") }

        assertThat(handled).isFalse()
        assertThat(target.calls).isEmpty()
    }

    @Test
    fun `reports a parse failure`() {
        val target = E2ECommandTargetSpy()

        val handled = handle("/teleport", target)

        assertThat(handled).isTrue()
        assertThat(target.calls).containsExactly("report(Unsupported e2e command)")
    }

    @Test
    fun `resets the cart`() {
        val target = E2ECommandTargetSpy()

        val handled = handle("/reset", target)

        assertThat(handled).isTrue()
        assertThat(target.calls).containsExactly("resetCart")
    }

    @Test
    fun `seeds the cart from a variant id`() {
        val target = E2ECommandTargetSpy()

        handle("/cart?variantId=gid://shopify/ProductVariant/1&quantity=3&buyerIdentityMode=hardcoded", target)

        assertThat(target.calls).containsExactly(
            "selectBuyerIdentityMode(hardcoded)",
            "resetCart",
            "addCartLine(gid://shopify/ProductVariant/1, 3)",
            "showCart",
        )
    }

    @Test
    fun `seeds the cart from a product index`() {
        val target = E2ECommandTargetSpy()

        handle("/cart?productIndex=2", target)

        assertThat(target.calls).containsExactly(
            "resetCart",
            "variantId(atProductIndex: 2)",
            "addCartLine(variant-2, 1)",
            "showCart",
        )
    }

    @Test
    fun `selects the buyer identity mode before seeding because selecting it resets the cart`() {
        val target = E2ECommandTargetSpy()

        handle("/cart?productIndex=0&buyerIdentityMode=guest", target)

        assertThat(target.calls.first()).isEqualTo("selectBuyerIdentityMode(guest)")
    }

    @Test
    fun `reports a seed failure and does not show the cart`() {
        val target = E2ECommandTargetSpy()
        target.variantIdError = IllegalStateException("No product at index 9")

        handle("/cart?productIndex=9", target)

        assertThat(target.calls).containsExactly(
            "resetCart",
            "variantId(atProductIndex: 9)",
            "report(No product at index 9)",
        )
    }

    @Test
    fun `presents sign in`() {
        val target = E2ECommandTargetSpy()

        handle("/signIn", target)

        assertThat(target.calls).containsExactly("presentSignIn")
    }

    @Test
    fun `serializes concurrent handle calls so the second does not start until the first finishes`() = runBlocking<Unit> {
        val target = E2ECommandTargetSpy()
        val firstResetStarted = CompletableDeferred<Unit>()
        val releaseFirstReset = CompletableDeferred<Unit>()
        target.onResetCart = {
            firstResetStarted.complete(Unit)
            releaseFirstReset.await()
        }

        val first = launch { E2EController(target).handle("com.shopify.checkoutkit.androiddemo://e2e/reset") }
        firstResetStarted.await()

        val second = launch { E2EController(target).handle("com.shopify.checkoutkit.androiddemo://e2e/reset") }
        yield()

        assertThat(target.calls).containsExactly("resetCart")

        releaseFirstReset.complete(Unit)
        first.join()
        second.join()

        assertThat(target.calls).containsExactly("resetCart", "resetCart")
    }

    private fun handle(path: String, target: E2ECommandTargetSpy) = runBlocking {
        E2EController(target).handle("com.shopify.checkoutkit.androiddemo://e2e$path")
    }
}

private class E2ECommandTargetSpy : E2ECommandTarget {
    val calls = mutableListOf<String>()
    var variantIdError: Throwable? = null
    var addCartLineError: Throwable? = null
    var onResetCart: (suspend () -> Unit)? = null

    override suspend fun selectBuyerIdentityMode(mode: E2EBuyerIdentityMode) {
        calls.add("selectBuyerIdentityMode(${mode.parameterValue})")
    }

    override suspend fun resetCart() {
        calls.add("resetCart")
        onResetCart?.invoke()
    }

    override suspend fun variantId(atProductIndex: Int): String {
        calls.add("variantId(atProductIndex: $atProductIndex)")
        variantIdError?.let { throw it }

        return "variant-$atProductIndex"
    }

    override suspend fun addCartLine(variantId: String, quantity: Int) {
        calls.add("addCartLine($variantId, $quantity)")
        addCartLineError?.let { throw it }
    }

    override suspend fun showCart() {
        calls.add("showCart")
    }

    override suspend fun presentSignIn() {
        calls.add("presentSignIn")
    }

    override suspend fun report(failure: String) {
        calls.add("report($failure)")
    }
}
