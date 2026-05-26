import ApolloAPI

enum SchemaConfiguration: ApolloAPI.SchemaConfiguration {
    static func cacheKeyInfo(for _: ApolloAPI.Object, object _: ApolloAPI.ObjectData) -> CacheKeyInfo? {
        // Implement this function to configure cache key resolution for your schema types.
        return nil
    }
}
