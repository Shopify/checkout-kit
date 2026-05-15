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
#if COCOAPODS
    import ShopifyCheckoutKit
#else
    import ShopifyCheckoutProtocol
#endif

func makeRelayClient(
    subscribedMethods: [String],
    dispatch: @escaping @MainActor @Sendable (String) -> Void
) -> CheckoutProtocol.Client {
    var client = CheckoutProtocol.Client()

    for method in subscribedMethods {
        switch method {
        case CheckoutProtocol.start.method:
            client = client.on(CheckoutProtocol.start) { checkout in
                forwardEnvelope(type: method, payload: checkout, dispatch: dispatch)
            }
        default:
            continue
        }
    }

    return client
}

@MainActor
private func forwardEnvelope<P: Encodable>(
    type: String,
    payload: P,
    dispatch: @MainActor @Sendable (String) -> Void
) {
    guard let json = try? CasingTransform.encodeForJS(DispatchEnvelope(type: type, payload: payload)) else {
        return
    }
    dispatch(json)
}
