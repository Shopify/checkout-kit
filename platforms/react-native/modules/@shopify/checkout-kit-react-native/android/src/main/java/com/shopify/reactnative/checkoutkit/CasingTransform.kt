/*
 * MIT License
 *
 * Copyright 2023-present, Shopify Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
package com.shopify.reactnative.checkoutkit

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.encodeToJsonElement

/**
 * Bridges typed snake_case payloads (per @SerialName annotations on the native models)
 * with camelCase JSON expected by JavaScript consumers.
 */
internal object CasingTransform {

    private const val CAMEL_TO_SNAKE_BUFFER_PADDING: Int = 4

    internal val json: Json = Json { ignoreUnknownKeys = true }

    fun snakeToCamel(s: String): String {
        if (s.isEmpty() || !s.contains('_')) return s
        val builder = StringBuilder(s.length)
        var upperNext = false
        for (ch in s) {
            if (ch == '_') {
                upperNext = true
            } else if (upperNext) {
                builder.append(ch.uppercaseChar())
                upperNext = false
            } else {
                builder.append(ch)
            }
        }
        return builder.toString()
    }

    fun camelToSnake(s: String): String {
        if (s.isEmpty()) return s
        val builder = StringBuilder(s.length + CAMEL_TO_SNAKE_BUFFER_PADDING)
        for (ch in s) {
            if (ch.isUpperCase()) {
                builder.append('_').append(ch.lowercaseChar())
            } else {
                builder.append(ch)
            }
        }
        return builder.toString()
    }

    fun transformKeys(element: JsonElement, fn: (String) -> String): JsonElement = when (element) {
        is JsonObject -> JsonObject(element.entries.associate { (key, value) -> fn(key) to transformKeys(value, fn) })
        is JsonArray -> JsonArray(element.map { transformKeys(it, fn) })
        else -> element
    }

    inline fun <reified T> encodeForJS(payload: T): String {
        val element = json.encodeToJsonElement(payload)
        val transformed = transformKeys(element, ::snakeToCamel)
        return json.encodeToString(JsonElement.serializer(), transformed)
    }

    inline fun <reified T> decodeFromJS(json: String): T {
        val element = Json.parseToJsonElement(json)
        val transformed = transformKeys(element, ::camelToSnake)
        return CasingTransform.json.decodeFromJsonElement(transformed)
    }
}
