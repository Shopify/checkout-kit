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
package com.shopify.checkoutkit

import android.net.Uri
import androidx.core.net.toUri

internal fun Uri?.isWebLink(): Boolean = setOf(Scheme.HTTP, Scheme.HTTPS).contains(this?.scheme)
internal fun Uri?.isMailtoLink(): Boolean = this?.scheme == Scheme.MAILTO
internal fun Uri?.isTelLink(): Boolean = this?.scheme == Scheme.TEL
internal fun Uri?.isAboutScheme(): Boolean = this?.scheme == Scheme.ABOUT
internal fun Uri?.isContactLink(): Boolean = this.isMailtoLink() || this.isTelLink()
internal fun Uri?.isDeepLink(): Boolean = this != null && !this.isWebLink() && !this.isContactLink() && !this.isAboutScheme()
internal fun Uri?.isConfirmationPage(): Boolean =
    this?.pathSegments?.any { CONFIRMATION_PATH_REGEX.matches(it) } == true
internal fun String.isOneTimeUse(): Boolean = this.contains("multipass")

/**
 * Appends Embedded Checkout Protocol query parameters to a checkout URL, leaving any
 * params already present on the URL untouched. Idempotent on re-call.
 *
 * - `ec_version`   — the ECP spec version the SDK speaks
 * - `ec_delegate`  — fixed to `window.open` so checkout delegates link opens to the bridge
 */
internal fun String.appendEcpParams(specVersion: String): String {
    val uri = this.toUri()
    val builder = uri.buildUpon()
    if (uri.getQueryParameter(EC_VERSION_PARAM) == null) {
        builder.appendQueryParameter(EC_VERSION_PARAM, specVersion)
    }
    if (uri.getQueryParameter(EC_DELEGATE_PARAM) == null) {
        builder.appendQueryParameter(EC_DELEGATE_PARAM, EC_DELEGATE_VALUE)
    }
    return builder.build().toString()
}

private val CONFIRMATION_PATH_REGEX = Regex(pattern = "^(thank[-_]+you)$", option = RegexOption.IGNORE_CASE)

private const val EC_VERSION_PARAM = "ec_version"
private const val EC_DELEGATE_PARAM = "ec_delegate"
private const val EC_DELEGATE_VALUE = "window.open"

internal object Scheme {
    const val HTTP = "http"
    const val HTTPS = "https"
    const val TEL = "tel"
    const val MAILTO = "mailto"
    const val ABOUT = "about"
}
