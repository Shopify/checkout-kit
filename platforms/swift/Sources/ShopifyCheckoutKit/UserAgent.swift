import Foundation
import UIKit

public enum UserAgent {
    private static let baseUserAgent = "ShopifyCheckoutKit/\(MetaData.version)"

    /// Shared format for CheckoutKit and AcceleratedCheckouts
    package static func string(
        platform: Platform? = nil,
        entryPoint: MetaData.EntryPoint? = nil
    ) -> String {
        var parameters = "iOS;Swift"
        if let swiftVersion = SwiftVersion.current {
            parameters.append(" \(swiftVersion)")
        }
        parameters.append(";iOSVersion/\(UIDevice.current.systemVersion)")

        var userAgentString = "\(baseUserAgent) (\(parameters))"

        if let platform {
            userAgentString.append(" \(platform.identifier)")
            if let version = platform.version {
                userAgentString.append("/\(version)")
            }
        }

        if let entryPoint {
            userAgentString.append(" \(entryPoint.rawValue)")
        }

        return userAgentString
    }
}
