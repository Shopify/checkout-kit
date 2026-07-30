package com.shopify.checkoutkit.androiddemo.logs.details

import androidx.compose.ui.text.SpanStyle
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class JsonPayloadDiffTest {
    private val json = Json
    private val changedStyle = SpanStyle()

    @Test
    fun `does not compare an invalid payload`() {
        val result = json.diffPayload("not json", "{\"value\": 1}", changedStyle)

        assertEquals("not json", result.payload.text)
        assertEquals(PayloadComparison.NOT_COMPARED, result.comparison)
    }

    @Test
    fun `reports an unchanged valid payload`() {
        val result = json.diffPayload("{\"value\": 1}", "{\"value\":1}", changedStyle)

        assertEquals(PayloadComparison.UNCHANGED, result.comparison)
        assertEquals(emptyList<String>(), result.removedPaths)
    }

    @Test
    fun `reports removed nested object fields and array items`() {
        val result = json.diffPayload(
            payload = "{\"items\":[{\"id\":\"one\"}],\"status\":\"new\"}",
            previousPayload = "{\"items\":[{\"id\":\"one\"},{\"id\":\"two\"}],\"status\":\"old\",\"removed\":true}",
            changedStyle = changedStyle,
        )

        assertEquals(PayloadComparison.CHANGED, result.comparison)
        assertEquals(listOf("$.items[1]", "$.removed"), result.removedPaths)
        assertTrue(result.payload.text.contains("\"status\""))
    }

    @Test
    fun `formats a first valid payload without treating it as changed`() {
        val result = json.diffPayload("{\"value\": [1, 2]}", null, changedStyle)

        assertEquals(PayloadComparison.NOT_COMPARED, result.comparison)
        assertTrue(result.payload.text.contains("\"value\""))
    }
}
