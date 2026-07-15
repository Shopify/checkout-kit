package com.shopify.checkoutkit

/**
 * Matches incoming-message origins against a configured allowlist.
 *
 * Native checkout is **open by default**: an empty merchant allowlist trusts every origin. Once a
 * merchant configures origins, the effective allowlist is those origins plus two safe defaults —
 * the cart URL origin and `shop.app` (including its subdomains). `"*"` is an explicit escape hatch
 * that trusts every origin.
 *
 * Allowlist entries are origin patterns:
 * - `"*"` trusts every origin.
 * - A wildcard subdomain such as `*.example.com` trusts proper subdomains of `example.com` (not the
 *   apex), and requires the scheme and port to match.
 * - Anything else is treated as an exact origin (`scheme://host[:port]`).
 */
internal object OriginAllowlist {
    const val SHOP_APP_ORIGIN: String = "https://shop.app"

    private const val WILDCARD_ALL = "*"
    private val SHOP_APP_PATTERNS = listOf(SHOP_APP_ORIGIN, "https://*.shop.app")

    private val ORIGIN_PATTERN = Regex("""^([a-zA-Z][\w+.\-]*)://([^/:]+)(?::(\d+))?$""")
    private val WILDCARD_PATTERN = Regex("""^([a-zA-Z][\w+.\-]*)://\*\.([^/:]+)(?::(\d+))?$""")

    private data class Origin(val scheme: String, val host: String, val port: String?)

    /**
     * Returns the effective allowlist patterns for the given [checkoutOrigin] (cart URL origin) and
     * merchant-[configured] origins, or `null` when validation is disabled — either because no
     * origins are configured (native open-by-default) or because `"*"` is present.
     */
    fun effectivePatterns(checkoutOrigin: String?, configured: Set<String>): List<String>? {
        if (configured.isEmpty() || configured.contains(WILDCARD_ALL)) return null

        val patterns = mutableListOf<String>()
        if (!checkoutOrigin.isNullOrBlank()) patterns.add(checkoutOrigin)
        patterns.addAll(SHOP_APP_PATTERNS)
        configured.filterTo(patterns) { isValidPattern(it) }
        return patterns
    }

    /** Returns whether [origin] satisfies any of [patterns]. A `null` [patterns] trusts everything. */
    fun isAllowed(origin: String, patterns: List<String>?): Boolean {
        if (patterns == null) return true
        return patterns.any { matches(it, origin) }
    }

    /** Extracts the `scheme://host[:port]` origin from a full URL, or `null` when it cannot parse. */
    fun originFromUrl(url: String): String? = try {
        val uri = java.net.URI(url)
        val scheme = uri.scheme
        val host = uri.host
        when {
            scheme == null || host == null -> null
            uri.port != -1 -> "$scheme://$host:${uri.port}"
            else -> "$scheme://$host"
        }
    } catch (_: Exception) {
        null
    }

    private fun isValidPattern(pattern: String): Boolean = when {
        pattern == WILDCARD_ALL -> true
        pattern.contains("*") -> WILDCARD_PATTERN.matches(pattern)
        else -> parseOrigin(pattern) != null
    }

    private fun matches(pattern: String, origin: String): Boolean {
        val target = parseOrigin(origin)
        return when {
            pattern == WILDCARD_ALL -> true
            target == null -> false
            pattern.contains("*") -> matchesWildcard(pattern, target)
            else -> parseOrigin(pattern) == target
        }
    }

    private fun matchesWildcard(pattern: String, target: Origin): Boolean {
        val match = WILDCARD_PATTERN.matchEntire(pattern) ?: return false
        val (scheme, suffix, port) = match.destructured
        val suffixHost = suffix.lowercase()
        return target.scheme.equals(scheme, ignoreCase = true) &&
            port.ifEmpty { null } == target.port &&
            target.host != suffixHost &&
            target.host.endsWith(".$suffixHost")
    }

    private fun parseOrigin(value: String): Origin? {
        val match = ORIGIN_PATTERN.matchEntire(value.trim()) ?: return null
        val (scheme, host, port) = match.destructured
        return Origin(scheme.lowercase(), host.lowercase(), port.ifEmpty { null })
    }
}
