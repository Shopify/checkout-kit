package com.shopify.checkoutkit

internal class HttpResponseHandler {

    internal enum class Disposition {
        HANDLE_NORMALLY,
        RENDER,
        DISCARD_PRELOAD,
    }

    internal fun disposition(
        responseHeaders: Map<String, String>?,
        isForMainFrame: Boolean,
        isBackgroundedPreload: Boolean,
    ): Disposition {
        if (!isManagedChallenge(responseHeaders)) {
            return Disposition.HANDLE_NORMALLY
        }

        return if (isForMainFrame && isBackgroundedPreload) {
            Disposition.DISCARD_PRELOAD
        } else {
            Disposition.RENDER
        }
    }

    private fun isManagedChallenge(responseHeaders: Map<String, String>?): Boolean {
        val mitigation = responseHeaders
            ?.entries
            ?.firstOrNull { (name) -> name.equals(MITIGATION_HEADER, ignoreCase = true) }
            ?.value
            ?.trim()

        return mitigation.equals(CHALLENGE_VALUE, ignoreCase = true)
    }

    private companion object {
        private const val MITIGATION_HEADER = "cf-mitigated"
        private const val CHALLENGE_VALUE = "challenge"
    }
}
