/*
 MIT License

 Copyright 2023 - Present, Shopify Inc.

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import Foundation
import UIKit

public enum UserAgent {
    private static let baseUserAgent = "ShopifyCheckoutKit/\(MetaData.version)"

    /// Shared format for CheckoutKit and AcceleratedCheckouts
    package static func string(
        platform: Platform? = nil,
        entryPoint: MetaData.EntryPoint? = nil,
        recovery: Bool = false
    ) -> String {
        var parameters = "iOS;Swift"
        if let swiftVersion = SwiftVersion.current {
            parameters.append(" \(swiftVersion)")
        }

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

        if recovery {
            userAgentString.append(" recovery")
        }

        return userAgentString
    }
}
