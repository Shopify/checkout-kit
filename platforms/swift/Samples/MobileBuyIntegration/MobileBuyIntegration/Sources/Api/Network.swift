import Apollo
import ApolloAPI
import Foundation

final class Network: Sendable {
    static let shared = Network()

    private static func getLanguageCode() -> GraphQLEnum<Storefront.LanguageCode> {
        if let languageCode = Locale.current.language.languageCode?.identifier {
            let code = languageCode.uppercased()
            switch code {
            case "ZH":
                if let scriptCode = Locale.current.language.script?.identifier {
                    return GraphQLEnum(scriptCode == "Hans" ? Storefront.LanguageCode.zhCn : Storefront.LanguageCode.zhTw)
                }
                return GraphQLEnum(Storefront.LanguageCode.zhCn)
            case "PT":
                if let regionCode = Locale.current.language.region?.identifier {
                    return GraphQLEnum(regionCode == "BR" ? Storefront.LanguageCode.ptBr : Storefront.LanguageCode.ptPt)
                }
                return GraphQLEnum(Storefront.LanguageCode.pt)
            default:
                if let mappedCode = Storefront.LanguageCode(rawValue: code) {
                    return GraphQLEnum(mappedCode)
                }
                let baseLanguage = String(code.prefix(2))
                if let mappedCode = Storefront.LanguageCode(rawValue: baseLanguage) {
                    return GraphQLEnum(mappedCode)
                }
            }
        }
        return GraphQLEnum(Storefront.LanguageCode.en)
    }

    var countryCode: GraphQLEnum<Storefront.CountryCode> {
        GraphQLEnum(Storefront.CountryCode(rawValue: Locale.current.region?.identifier ?? "US") ?? .us)
    }

    var languageCode: GraphQLEnum<Storefront.LanguageCode> {
        Network.getLanguageCode()
    }

    let apollo: ApolloClient

    init() {
        let urlString = "https://\(InfoDictionary.shared.domain)/api/\(InfoDictionary.shared.apiVersion)/graphql.json"
        guard let url = URL(string: urlString) else {
            fatalError("Invalid GraphQL endpoint URL: \(urlString)")
        }

        let store = ApolloStore()
        let transport = RequestChainNetworkTransport(
            urlSession: URLSession.shared,
            interceptorProvider: StorefrontInterceptorProvider(),
            store: store,
            endpointURL: url
        )
        apollo = ApolloClient(networkTransport: transport, store: store)
    }
}

struct StorefrontInterceptorProvider: InterceptorProvider {
    func graphQLInterceptors(
        for operation: some GraphQLOperation
    ) -> [any GraphQLInterceptor] {
        DefaultInterceptorProvider.shared.graphQLInterceptors(for: operation) + [
            AuthorizationInterceptor()
        ]
    }
}

struct AuthorizationInterceptor: GraphQLInterceptor {
    func intercept<Request: GraphQLRequest>(
        request: Request,
        next: NextInterceptorFunction<Request>
    ) async throws -> InterceptorResultStream<Request> {
        var authenticatedRequest = request
        authenticatedRequest.additionalHeaders["X-Shopify-Storefront-Access-Token"] = InfoDictionary.shared.accessToken
        return await next(authenticatedRequest)
    }
}
