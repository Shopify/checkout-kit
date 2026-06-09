#if canImport(AppTrackingTransparency)
    import AppTrackingTransparency
#endif
import Foundation

public struct CheckoutURL {
    public let url: URL

    init(from url: URL) {
        self.url = url
    }

    public func isMultipassURL() -> Bool {
        return url.absoluteString.contains("multipass")
    }

    public func isBlank() -> Bool {
        return url.scheme == "about" || url.absoluteString == "about:blank"
    }

    public func isDeepLink() -> Bool {
        guard let scheme = url.scheme, !isBlank() else {
            return false
        }

        return !["http", "https"].contains(scheme)
    }
}

extension CheckoutURL {
    func appendingAppTrackingTransparencyStatus() -> URL {
        return replacingQueryParameter(
            name: CheckoutAppTrackingTransparency.queryParameterName,
            value: CheckoutAppTrackingTransparency.currentStatus()
        )
    }

    private func replacingQueryParameter(name: String, value: String) -> URL {
        guard var components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            return url
        }

        var queryItems = components.queryItems ?? []
        queryItems.removeAll { $0.name == name }
        queryItems.append(URLQueryItem(name: name, value: value))
        components.queryItems = queryItems

        return components.url ?? url
    }
}

enum CheckoutAppTrackingTransparency {
    static let queryParameterName = "_att"
    static let notApplicableStatus = "not_applicable"
    static var currentStatus: () -> String = defaultCurrentStatus

    /// Restores the production ATT status provider after tests override it.
    static func resetCurrentStatusProvider() {
        currentStatus = defaultCurrentStatus
    }

    private static func defaultCurrentStatus() -> String {
        #if canImport(AppTrackingTransparency)
            if #available(iOS 14.0, *) {
                return ATTrackingManager.trackingAuthorizationStatus.checkoutQueryValue
            }
        #endif

        return notApplicableStatus
    }
}

#if canImport(AppTrackingTransparency)
    @available(iOS 14.0, *)
    extension ATTrackingManager.AuthorizationStatus {
        fileprivate var checkoutQueryValue: String {
            switch self {
            case .authorized:
                return "authorized"
            case .denied:
                return "denied"
            case .notDetermined:
                return "not_determined"
            case .restricted:
                return "restricted"
            @unknown default:
                return "unknown"
            }
        }
    }
#endif
