package com.shopify.checkoutkit

import org.assertj.core.api.Assertions.assertThat
import org.junit.Test

class OriginAllowlistTest {

    private val cartOrigin = "https://checkout.shopify.com"

    @Test
    fun `no configured origins trusts every origin`() {
        val patterns = OriginAllowlist.effectivePatterns(cartOrigin, emptySet())

        assertThat(patterns).isNull()
        assertThat(OriginAllowlist.isAllowed("https://evil.example.com", patterns)).isTrue()
    }

    @Test
    fun `wildcard escape hatch trusts every origin`() {
        val patterns = OriginAllowlist.effectivePatterns(cartOrigin, setOf("*"))

        assertThat(patterns).isNull()
        assertThat(OriginAllowlist.isAllowed("https://evil.example.com", patterns)).isTrue()
    }

    @Test
    fun `configured allowlist trusts the cart origin and shop app by default`() {
        val patterns = OriginAllowlist.effectivePatterns(cartOrigin, setOf("https://allowed.example.com"))

        assertThat(OriginAllowlist.isAllowed(cartOrigin, patterns)).isTrue()
        assertThat(OriginAllowlist.isAllowed("https://shop.app", patterns)).isTrue()
        assertThat(OriginAllowlist.isAllowed("https://checkout.shop.app", patterns)).isTrue()
        assertThat(OriginAllowlist.isAllowed("https://allowed.example.com", patterns)).isTrue()
    }

    @Test
    fun `configured allowlist rejects untrusted origins`() {
        val patterns = OriginAllowlist.effectivePatterns(cartOrigin, setOf("https://allowed.example.com"))

        assertThat(OriginAllowlist.isAllowed("https://evil.example.com", patterns)).isFalse()
        assertThat(OriginAllowlist.isAllowed("http://checkout.shopify.com", patterns)).isFalse()
    }

    @Test
    fun `wildcard subdomain pattern matches proper subdomains only`() {
        val patterns = OriginAllowlist.effectivePatterns(cartOrigin, setOf("https://*.example.com"))

        assertThat(OriginAllowlist.isAllowed("https://fr.example.com", patterns)).isTrue()
        assertThat(OriginAllowlist.isAllowed("https://a.b.example.com", patterns)).isTrue()
        assertThat(OriginAllowlist.isAllowed("https://example.com", patterns)).isFalse()
        assertThat(OriginAllowlist.isAllowed("https://notexample.com", patterns)).isFalse()
    }

    @Test
    fun `wildcard subdomain pattern requires matching scheme and port`() {
        val patterns = OriginAllowlist.effectivePatterns(cartOrigin, setOf("https://*.example.com:8443"))

        assertThat(OriginAllowlist.isAllowed("https://fr.example.com:8443", patterns)).isTrue()
        assertThat(OriginAllowlist.isAllowed("https://fr.example.com", patterns)).isFalse()
        assertThat(OriginAllowlist.isAllowed("http://fr.example.com:8443", patterns)).isFalse()
    }

    @Test
    fun `default ports are normalized for exact and wildcard patterns`() {
        val patterns = OriginAllowlist.effectivePatterns(
            "https://checkout.shopify.com:443",
            setOf("https://allowed.example.com:443", "https://*.example.org:443"),
        )

        assertThat(OriginAllowlist.isAllowed("https://checkout.shopify.com", patterns)).isTrue()
        assertThat(OriginAllowlist.isAllowed("https://allowed.example.com", patterns)).isTrue()
        assertThat(OriginAllowlist.isAllowed("https://sub.example.org", patterns)).isTrue()
        assertThat(OriginAllowlist.isAllowed("https://sub.example.org:8443", patterns)).isFalse()
    }

    @Test
    fun `IPv6 origins support default and explicit ports`() {
        val patterns = OriginAllowlist.effectivePatterns(
            "https://[2001:db8::1]:443",
            setOf("https://[2001:db8::2]:8443"),
        )

        assertThat(OriginAllowlist.isAllowed("https://[2001:db8::1]", patterns)).isTrue()
        assertThat(OriginAllowlist.isAllowed("https://[2001:db8::2]:8443", patterns)).isTrue()
        assertThat(OriginAllowlist.isAllowed("https://[2001:db8::2]", patterns)).isFalse()
        assertThat(OriginAllowlist.originFromUrl("https://[2001:db8::1]:443/cart"))
            .isEqualTo("https://[2001:db8::1]")
    }

    @Test
    fun `invalid configured patterns are ignored`() {
        val patterns = OriginAllowlist.effectivePatterns(
            cartOrigin,
            setOf(
                "not a url",
                "https://user@allowed.example.com",
                "https://allowed.example.com/path",
                "https://allowed.example.com?query=value",
                "https://allowed.example.com#fragment",
            ),
        )

        assertThat(OriginAllowlist.isAllowed("https://not a url", patterns)).isFalse()
        assertThat(OriginAllowlist.isAllowed("https://allowed.example.com", patterns)).isFalse()
        assertThat(OriginAllowlist.isAllowed(cartOrigin, patterns)).isTrue()
    }

    @Test
    fun `exact and wildcard patterns accept a trailing slash`() {
        val patterns = OriginAllowlist.effectivePatterns(
            cartOrigin,
            setOf("https://allowed.example.com/", "https://*.example.org/"),
        )

        assertThat(OriginAllowlist.isAllowed("https://allowed.example.com", patterns)).isTrue()
        assertThat(OriginAllowlist.isAllowed("https://sub.example.org", patterns)).isTrue()
    }

    @Test
    fun `opaque origins are rejected`() {
        val patterns = OriginAllowlist.effectivePatterns(cartOrigin, setOf("https://allowed.example.com"))

        assertThat(OriginAllowlist.isAllowed("null", patterns)).isFalse()
    }

    @Test
    fun `originFromUrl extracts the origin from a full URL`() {
        assertThat(OriginAllowlist.originFromUrl("https://checkout.shopify.com/cart/123?foo=bar"))
            .isEqualTo("https://checkout.shopify.com")
        assertThat(OriginAllowlist.originFromUrl("https://checkout.shopify.com:8443/cart"))
            .isEqualTo("https://checkout.shopify.com:8443")
        assertThat(OriginAllowlist.originFromUrl("not a url")).isNull()
    }
}
