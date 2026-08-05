package com.shopify.checkoutkit.androiddemo.logs.details

import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.AnnotatedString.Builder
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject

internal data class JsonPayloadDiff(
    val payload: AnnotatedString,
    val comparison: PayloadComparison,
    val removedPaths: List<String> = emptyList(),
)

internal enum class PayloadComparison {
    NOT_COMPARED,
    UNCHANGED,
    CHANGED,
}

internal fun Json.diffPayload(
    payload: String,
    previousPayload: String?,
    changedStyle: SpanStyle,
): JsonPayloadDiff {
    val current = parsePayload(payload)
        ?: return JsonPayloadDiff(AnnotatedString(payload), PayloadComparison.NOT_COMPARED)
    val previous = previousPayload?.let(::parsePayload)
        ?: return JsonPayloadDiff(AnnotatedString(prettyPrint(current)), PayloadComparison.NOT_COMPARED)

    if (current == previous) {
        return JsonPayloadDiff(AnnotatedString(prettyPrint(current)), PayloadComparison.UNCHANGED)
    }

    return JsonPayloadDiff(
        payload = buildAnnotatedString {
            appendComparedJson(current, previous, depth = 0, changedStyle)
        },
        comparison = PayloadComparison.CHANGED,
        removedPaths = removedPaths(current, previous),
    )
}

private fun Json.parsePayload(payload: String): JsonElement? =
    runCatching { parseToJsonElement(payload) }.getOrNull()

private fun Json.prettyPrint(payload: JsonElement): String =
    encodeToString(JsonElement.serializer(), payload)

private fun Builder.appendComparedJson(
    current: JsonElement,
    previous: JsonElement?,
    depth: Int,
    changedStyle: SpanStyle,
) {
    if (current == previous) {
        appendJson(current, depth)
        return
    }

    when {
        previous == null -> withStyle(changedStyle) { appendJson(current, depth) }
        current is JsonObject && previous is JsonObject ->
            appendComparedObject(current, previous, depth, changedStyle)
        current is JsonArray && previous is JsonArray ->
            appendComparedArray(current, previous, depth, changedStyle)
        else -> withStyle(changedStyle) { appendJson(current, depth) }
    }
}

private fun Builder.appendComparedObject(
    current: JsonObject,
    previous: JsonObject,
    depth: Int,
    changedStyle: SpanStyle,
) {
    val removedKeys = previous.keys - current.keys
    appendStyled("{", removedKeys.isNotEmpty(), changedStyle)
    if (current.isNotEmpty()) append("\n")
    current.entries.forEachIndexed { index, (key, value) ->
        appendIndent(depth + 1)
        appendStyled(Json.encodeToString(key), previous[key] != value, changedStyle)
        append(": ")
        appendComparedJson(value, previous[key], depth + 1, changedStyle)
        if (index < current.size - 1) append(",")
        append("\n")
    }
    if (current.isNotEmpty()) appendIndent(depth)
    appendStyled("}", removedKeys.isNotEmpty(), changedStyle)
}

private fun Builder.appendComparedArray(
    current: JsonArray,
    previous: JsonArray,
    depth: Int,
    changedStyle: SpanStyle,
) {
    val sizeChanged = current.size != previous.size
    appendStyled("[", sizeChanged, changedStyle)
    if (current.isNotEmpty()) append("\n")
    current.forEachIndexed { index, value ->
        appendIndent(depth + 1)
        appendComparedJson(value, previous.getOrNull(index), depth + 1, changedStyle)
        if (index < current.size - 1) append(",")
        append("\n")
    }
    if (current.isNotEmpty()) appendIndent(depth)
    appendStyled("]", sizeChanged, changedStyle)
}

private fun Builder.appendJson(element: JsonElement, depth: Int) {
    when (element) {
        is JsonObject -> {
            append("{")
            if (element.isNotEmpty()) append("\n")
            element.entries.forEachIndexed { index, (key, value) ->
                appendIndent(depth + 1)
                append(Json.encodeToString(key))
                append(": ")
                appendJson(value, depth + 1)
                if (index < element.size - 1) append(",")
                append("\n")
            }
            if (element.isNotEmpty()) appendIndent(depth)
            append("}")
        }
        is JsonArray -> {
            append("[")
            if (element.isNotEmpty()) append("\n")
            element.forEachIndexed { index, value ->
                appendIndent(depth + 1)
                appendJson(value, depth + 1)
                if (index < element.size - 1) append(",")
                append("\n")
            }
            if (element.isNotEmpty()) appendIndent(depth)
            append("]")
        }
        else -> append(element.toString())
    }
}

private fun Builder.appendStyled(text: String, highlighted: Boolean, style: SpanStyle) {
    if (highlighted) {
        withStyle(style) { append(text) }
    } else {
        append(text)
    }
}

private fun Builder.appendIndent(depth: Int) {
    repeat(depth) { append("  ") }
}

private fun removedPaths(
    current: JsonElement,
    previous: JsonElement,
    path: String = "$",
): List<String> = when {
    current is JsonObject && previous is JsonObject -> buildList {
        previous.forEach { (key, previousValue) ->
            val currentValue = current[key]
            if (currentValue == null) {
                add("$path.$key")
            } else {
                addAll(removedPaths(currentValue, previousValue, "$path.$key"))
            }
        }
    }
    current is JsonArray && previous is JsonArray -> buildList {
        val sharedSize = minOf(current.size, previous.size)
        repeat(sharedSize) { index ->
            addAll(removedPaths(current[index], previous[index], "$path[$index]"))
        }
        for (index in current.size until previous.size) {
            add("$path[$index]")
        }
    }
    else -> emptyList()
}
