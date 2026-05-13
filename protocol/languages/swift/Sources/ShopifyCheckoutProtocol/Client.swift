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

extension CheckoutProtocol {
    public struct Client: Sendable, MutableCopyable {
        private var notificationHandlers: [String: @MainActor @Sendable (any EventPayload) -> Void]
        private var delegationEntries: [String: DelegationEntry]

        var delegations: [String] {
            delegationEntries.values.map(\.delegation)
        }

        public init() {
            notificationHandlers = [:]
            delegationEntries = [:]
        }

        @discardableResult
        public func on<P: EventPayload>(
            _ descriptor: NotificationDescriptor<P>,
            perform: @escaping @MainActor (P) -> Void
        ) -> Client {
            return copy {
                $0.notificationHandlers[descriptor.method] = { payload in
                    guard let typed = payload as? P else { return }
                    perform(typed)
                }
            }
        }

        @discardableResult
        public func on<P: EventPayload, R: ResponsePayload>(
            _ descriptor: DelegationDescriptor<P, R>,
            perform: @escaping @MainActor @Sendable (P) async -> R
        ) -> Client {
            return copy {
                $0.delegationEntries[descriptor.method] = DelegationEntry(
                    delegation: descriptor.delegation,
                    handler: { id, params in
                        guard let payload = descriptor.decode(params) else { return nil }
                        let result = await perform(payload)
                        return CheckoutProtocol.encodeResponse(id: id, result: result)
                    }
                )
            }
        }

        public func process(_ message: String) async -> String? {
            let decoded = CheckoutProtocol.decode(jsonRpc: message)

            switch decoded {
            case let .ready(id, requested):
                let accepted = requested.filter(Set(delegations).contains)
                return CheckoutProtocol.encodeReadyResponse(id: id, acceptedDelegations: accepted)

            case let .notification(method, payload):
                await notificationHandlers[method]?(payload)
                return nil

            case let .request(id, method, params):
                if let entry = delegationEntries[method] {
                    return await entry.handler(id, params)
                }
                return nil

            case .unknown:
                return nil
            }
        }
    }

    struct DelegationEntry {
        let delegation: String
        let handler: @MainActor @Sendable (String, Data) async -> String?
    }
}
