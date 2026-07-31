import Foundation
import WebKit

/// Details about an incoming checkout message that was rejected during origin
/// validation. Surfaced through `Configuration.onMessageRejected`.
public struct MessageRejection: Sendable {
    /// The origin the message was received from, e.g. `https://example.com`.
    public let origin: String
    /// The raw message body as received from the checkout surface.
    public let message: String
    /// Human-readable reason the message was rejected.
    public let reason: String

    public init(origin: String, message: String, reason: String) {
        self.origin = origin
        self.message = message
        self.reason = reason
    }
}

/// A normalized representation of a message origin (scheme + host + port).
struct MessageOrigin: Equatable {
    let scheme: String
    let host: String
    /// The explicit port, or `nil` when the scheme's default port is used.
    let port: Int?

    init(scheme: String, host: String, port: Int?) {
        self.scheme = scheme.lowercased()
        self.host = host.trimmingCharacters(in: CharacterSet(charactersIn: "[]")).lowercased()
        self.port = Self.normalizedPort(scheme: scheme.lowercased(), port: port)
    }

    init?(url: URL) {
        guard let scheme = url.scheme, let host = url.host else { return nil }
        self.init(scheme: scheme, host: host, port: url.port)
    }

    @MainActor
    init(securityOrigin: WKSecurityOrigin) {
        // WKSecurityOrigin reports 0 when the default port for the scheme is used.
        let normalizedPort = securityOrigin.port == 0 ? nil : securityOrigin.port
        self.init(scheme: securityOrigin.protocol, host: securityOrigin.host, port: normalizedPort)
    }

    /// The port used for comparison, resolving default ports for known schemes.
    var effectivePort: Int? {
        if let port { return port }
        switch scheme {
        case "https": return 443
        case "http": return 80
        default: return nil
        }
    }

    var description: String {
        let serializedHost = host.contains(":") ? "[\(host)]" : host
        if let port {
            return "\(scheme)://\(serializedHost):\(port)"
        }
        return "\(scheme)://\(serializedHost)"
    }

    private static func normalizedPort(scheme: String, port: Int?) -> Int? {
        switch (scheme, port) {
        case ("https", 443), ("http", 80): nil
        default: port
        }
    }
}

/// Computes the effective allowlist for incoming checkout messages and matches
/// origins against origin patterns.
///
/// Native surfaces are open by default: an empty configured allowlist accepts
/// messages from any origin. When a merchant provides an allowlist, only the
/// configured origins plus the loaded checkout origin and shop.app are trusted.
/// `"*"` disables validation entirely.
enum MessageOriginValidator {
    /// The escape hatch pattern that disables validation.
    static let allowAllPattern = "*"

    /// shop.app is trusted by default; both the apex and its subdomains are allowed
    /// so regional/checkout subdomains work without extra configuration.
    static let shopAppOriginPatterns = ["https://shop.app", "https://*.shop.app"]

    /// Returns the effective allowlist patterns, or `nil` when validation is
    /// disabled (allow all).
    ///
    /// - Parameters:
    ///   - configuredOrigins: Merchant-supplied allowlist entries.
    ///   - checkoutURL: The loaded checkout URL, whose origin is always trusted.
    static func effectiveAllowlist(
        configuredOrigins: [String],
        checkoutURL: URL?
    ) -> [String]? {
        if configuredOrigins.contains(allowAllPattern) {
            return nil
        }
        // Native surface: no allowlist means allow all origins.
        if configuredOrigins.isEmpty {
            return nil
        }

        var patterns = configuredOrigins
        if let checkoutURL, let origin = MessageOrigin(url: checkoutURL) {
            patterns.append(origin.description)
        }
        patterns.append(contentsOf: shopAppOriginPatterns)
        return patterns
    }

    /// Whether `origin` matches any pattern in `patterns`. A `nil` list means
    /// validation is disabled and every origin is allowed.
    static func isAllowed(origin: MessageOrigin, patterns: [String]?) -> Bool {
        guard let patterns else { return true }
        return patterns.contains { matches(pattern: $0, origin: origin) }
    }

    /// Matches a single origin pattern against a target origin.
    ///
    /// - `"*"` matches any origin.
    /// - `"https://*.example.com"` matches proper subdomains of `example.com`
    ///   (not the apex), with matching scheme and port.
    /// - `"https://example.com"` matches the exact origin.
    ///
    /// Invalid patterns return `false` (skipped).
    static func matches(pattern: String, origin: MessageOrigin) -> Bool {
        if pattern == allowAllPattern { return true }

        guard let parsed = parse(pattern: pattern) else { return false }
        guard parsed.scheme == origin.scheme else { return false }

        let patternPort = MessageOrigin(scheme: parsed.scheme, host: parsed.host, port: parsed.port).effectivePort
        guard patternPort == origin.effectivePort else { return false }

        if parsed.isWildcard {
            return origin.host.hasSuffix(".\(parsed.host)") && origin.host != parsed.host
        }
        return origin.host == parsed.host
    }

    private struct ParsedPattern {
        let scheme: String
        let host: String
        let port: Int?
        let isWildcard: Bool
    }

    private static func parse(pattern: String) -> ParsedPattern? {
        guard let schemeSeparator = pattern.range(of: "://") else { return nil }
        let scheme = String(pattern[..<schemeSeparator.lowerBound]).lowercased()
        guard !scheme.isEmpty else { return nil }

        var authority = String(pattern[schemeSeparator.upperBound...])
        if let pathStart = authority.firstIndex(of: "/") {
            authority = String(authority[..<pathStart])
        }
        guard !authority.isEmpty else { return nil }

        guard var (host, port) = parseAuthority(authority) else { return nil }
        host = host.lowercased()
        guard !host.isEmpty else { return nil }

        let isWildcard = host.hasPrefix("*.")
        let baseHost = isWildcard ? String(host.dropFirst(2)) : host
        guard !baseHost.isEmpty else { return nil }

        return ParsedPattern(scheme: scheme, host: baseHost, port: port, isWildcard: isWildcard)
    }

    private static func parseAuthority(_ authority: String) -> (host: String, port: Int?)? {
        if authority.hasPrefix("[") {
            guard let closingBracket = authority.firstIndex(of: "]") else { return nil }
            let host = String(authority[authority.index(after: authority.startIndex) ..< closingBracket])
            let remainder = authority[authority.index(after: closingBracket)...]
            guard !remainder.isEmpty else { return (host, nil) }
            guard remainder.first == ":", let port = Int(remainder.dropFirst()) else { return nil }
            return (host, port)
        }

        if let colon = authority.lastIndex(of: ":") {
            guard authority[..<colon].contains(":") == false else { return nil }
            let portString = String(authority[authority.index(after: colon)...])
            guard let port = Int(portString) else { return nil }
            return (String(authority[..<colon]), port)
        }

        return (authority, nil)
    }
}
