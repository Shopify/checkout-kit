import ApolloAPI

extension Storefront {
    /// Represents an [RFC 3986](https://datatracker.ietf.org/doc/html/rfc3986) and
    /// [RFC 3987](https://datatracker.ietf.org/doc/html/rfc3987)-compliant URI string.
    ///
    /// For example, `"https://example.myshopify.com"` is a valid URL. It includes a scheme (`https`) and a host
    /// (`example.myshopify.com`).
    typealias URL = String
}
