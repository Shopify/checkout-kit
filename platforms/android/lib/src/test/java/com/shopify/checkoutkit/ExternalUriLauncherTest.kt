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

import android.content.Context
import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.net.Uri
import org.assertj.core.api.Assertions.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.kotlin.any
import org.mockito.kotlin.argumentCaptor
import org.mockito.kotlin.doThrow
import org.mockito.kotlin.eq
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class ExternalUriLauncherTest {

    @Test
    fun `launch external app rejects when startActivity throws security exception`() {
        val context = mock<Context>()
        doThrow(SecurityException("blocked")).whenever(context).startActivity(any<Intent>())

        val result = ExternalUriLauncher.launchExternalApp(context, Uri.parse("https://example.com"))

        assertThat(result).isEqualTo(ExternalUriLauncher.Result.Rejected(reason = "blocked"))
    }

    @Test
    fun `launch uses external app for non-web schemes`() {
        val context = mock<Context>()

        val result = ExternalUriLauncher.launch(context, Uri.parse("mailto:help@example.com"))

        assertThat(result).isEqualTo(ExternalUriLauncher.Result.Launched)
        val intent = argumentCaptor<Intent>()
        verify(context).startActivity(intent.capture())
        assertThat(intent.firstValue.extras?.keySet().orEmpty())
            .doesNotContain(CUSTOM_TABS_SESSION_EXTRA)
    }

    @Test
    fun `launch uses a targeted Custom Tab for web links`() {
        val context = mock<Context>()
        val packageManager = mock<PackageManager>()
        whenever(context.packageManager).thenReturn(packageManager)
        whenever(packageManager.queryIntentActivities(any<Intent>(), eq(0)))
            .thenReturn(
                listOf(
                    ResolveInfo().apply {
                        activityInfo = ActivityInfo().apply { packageName = BROWSER_PACKAGE }
                    },
                ),
            )
        whenever(packageManager.resolveService(any<Intent>(), eq(0))).thenReturn(ResolveInfo())

        val result = ExternalUriLauncher.launch(context, Uri.parse("https://example.com"))

        assertThat(result).isEqualTo(ExternalUriLauncher.Result.Launched)
        val intent = argumentCaptor<Intent>()
        verify(context).startActivity(intent.capture())
        assertThat(intent.firstValue.`package`).isEqualTo(BROWSER_PACKAGE)
        assertThat(intent.firstValue.extras?.keySet().orEmpty())
            .contains(CUSTOM_TABS_SESSION_EXTRA)
    }

    private companion object {
        private const val BROWSER_PACKAGE = "com.example.browser"
        private const val CUSTOM_TABS_SESSION_EXTRA = "android.support.customtabs.extra.SESSION"
    }
}
