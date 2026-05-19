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
