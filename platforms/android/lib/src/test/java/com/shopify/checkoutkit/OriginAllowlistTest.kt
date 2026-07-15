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
    fun `invalid configured patterns are ignored`() {
        val patterns = OriginAllowlist.effectivePatterns(cartOrigin, setOf("not a url"))

        assertThat(OriginAllowlist.isAllowed("https://not a url", patterns)).isFalse()
        assertThat(OriginAllowlist.isAllowed(cartOrigin, patterns)).isTrue()
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
