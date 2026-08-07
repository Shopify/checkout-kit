package com.shopify.checkoutkit

import java.net.URI

/**
 * Matches incoming-message origins against a configured allowlist.
 *
 * Native checkout is **open by default**: an empty merchant allowlist trusts every origin. Once a
 * merchant configures origins, the effective allowlist is those origins plus two safe defaults —
 * the cart URL origin and Shopify-owned `shop.app` and `shop.com` domains (including their
 * subdomains). `"*"` is an explicit escape hatch
 * that trusts every origin.
 *
 * Allowlist entries are origin patterns:
 * - `"*"` trusts every origin.
 * - A scheme-qualified wildcard subdomain trusts proper subdomains of its suffix (not the apex),
 *   and requires the scheme and effective port to match.
 * - Anything else must be an exact origin (`scheme://host[:port]`) with no credentials, path,
 *   query, or fragment. A trailing slash is accepted.
 */
internal object OriginAllowlist {
    const val SHOP_APP_ORIGIN: String = "https://shop.app"
    const val SHOP_COM_ORIGIN: String = "https://shop.com"

    private const val WILDCARD_ALL = "*"
    private const val HTTP_DEFAULT_PORT = 80
    private const val HTTPS_DEFAULT_PORT = 443

    sealed interface OriginPattern {
        data class Exact(val origin: Origin) : OriginPattern
        data class Wildcard(val scheme: String, val suffix: String, val port: Int?) : OriginPattern
    }

    data class Origin(val scheme: String, val host: String, val port: Int?)

    private val WILDCARD_PATTERN = Regex("""^(https?)://\*\.([^/:]+)(?::(\d+))?/?$""", RegexOption.IGNORE_CASE)
    private val SHOP_ORIGIN_PATTERNS = listOf(
        OriginPattern.Exact(requireNotNull(parseOrigin(SHOP_APP_ORIGIN, exact = true))),
        requireNotNull(parsePattern("https://*.shop.app")),
        OriginPattern.Exact(requireNotNull(parseOrigin(SHOP_COM_ORIGIN, exact = true))),
        requireNotNull(parsePattern("https://*.shop.com")),
    )

    /**
     * Returns the effective allowlist patterns for the given [checkoutOrigin] (cart URL origin) and
     * merchant-[configured] origins, or `null` when validation is disabled — either because no
     * origins are configured (native open-by-default) or because `"*"` is present.
     */
    fun effectivePatterns(checkoutOrigin: String?, configured: Set<String>): List<OriginPattern>? {
        if (configured.isEmpty() || configured.contains(WILDCARD_ALL)) return null

        return buildList {
            checkoutOrigin?.let { parseOrigin(it, exact = true) }?.let { add(OriginPattern.Exact(it)) }
            addAll(SHOP_ORIGIN_PATTERNS)
            configured.mapNotNullTo(this) { parsePattern(it) }
        }
    }

    /** Returns whether [origin] satisfies any of [patterns]. A `null` [patterns] trusts everything. */
    fun isAllowed(origin: String, patterns: List<OriginPattern>?): Boolean =
        patterns?.let { allowedPatterns ->
            parseOrigin(origin, exact = true)?.let { target ->
                allowedPatterns.any { pattern ->
                    when (pattern) {
                        is OriginPattern.Exact -> pattern.origin == target
                        is OriginPattern.Wildcard ->
                            pattern.scheme == target.scheme &&
                                pattern.port == target.port &&
                                target.host != pattern.suffix &&
                                target.host.endsWith(".${pattern.suffix}")
                    }
                }
            } ?: false
        } ?: true

    /** Extracts the `scheme://host[:port]` origin from a full URL, or `null` when it cannot parse. */
    fun originFromUrl(url: String): String? = parseOrigin(url, exact = false)?.serialize()

    fun isHttpsUrl(url: String): Boolean = parseOrigin(url, exact = false)?.scheme == Scheme.HTTPS

    private fun parsePattern(pattern: String): OriginPattern? = when {
        pattern == WILDCARD_ALL -> null
        !pattern.contains("*") -> parseOrigin(pattern, exact = true)?.let(OriginPattern::Exact)
        else -> WILDCARD_PATTERN.matchEntire(pattern)?.destructured?.let { (scheme, suffix, port) ->
            val normalizedScheme = scheme.lowercase()
            val parsedPort = when {
                port.isEmpty() -> null
                else -> port.toIntOrNull() ?: return null
            }
            OriginPattern.Wildcard(
                scheme = normalizedScheme,
                suffix = suffix.lowercase(),
                port = normalizedPort(normalizedScheme, parsedPort),
            )
        }
    }

    private fun parseOrigin(value: String, exact: Boolean): Origin? =
        try {
            val uri = URI(value.trim())
            val scheme = uri.scheme?.lowercase() ?: return null
            val host = uri.host?.removeSurrounding("[", "]")?.lowercase() ?: return null
            val hasSupportedScheme = scheme == Scheme.HTTP || scheme == Scheme.HTTPS
            val hasOnlyOriginComponents = !exact || hasOnlyOriginComponents(uri)
            if (!hasSupportedScheme || uri.userInfo != null || !hasOnlyOriginComponents) {
                null
            } else {
                Origin(scheme, host, normalizedPort(scheme, uri.port.takeUnless { it == -1 }))
            }
        } catch (_: Exception) {
            null
        }

    private fun hasOnlyOriginComponents(uri: URI): Boolean {
        val hasNoPath = uri.path.isNullOrEmpty() || uri.path == "/"
        return hasNoPath && uri.query == null && uri.fragment == null
    }

    private fun normalizedPort(scheme: String, port: Int?): Int? = when {
        scheme == Scheme.HTTPS && port == HTTPS_DEFAULT_PORT -> null
        scheme == Scheme.HTTP && port == HTTP_DEFAULT_PORT -> null
        else -> port
    }

    private fun Origin.serialize(): String {
        val serializedHost = if (host.contains(':')) "[$host]" else host
        return "$scheme://$serializedHost${port?.let { ":$it" }.orEmpty()}"
    }
}
