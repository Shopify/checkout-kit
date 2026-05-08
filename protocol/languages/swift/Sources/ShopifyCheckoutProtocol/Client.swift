import Foundation


extension CheckoutProtocol {
    public struct Client: Sendable, Copyable {
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
            perform: @escaping @MainActor (P) async -> R
        ) -> Client {
            return copy {
                $0.delegationEntries[descriptor.method] = DelegationEntry(
                    delegation: descriptor.delegation,
                    handler: { id, checkout in
                        guard let payload = checkout as? P else { return nil }
                        let result = await perform(payload)
                        return CheckoutProtocol.encodeResponse(id: id, result: result)
                    }
                )
            }
        }

        public func process(_ message: String) async -> String? {
            let decoded = CheckoutProtocol.decode(jsonRpc: message)

            switch decoded {
            case .ready(let id, let delegations):
                let payload = ReadyPayload(delegations: delegations)
                await notificationHandlers["ec.ready"]?(payload)
                return CheckoutProtocol.encodeResponse(id: id, result: EmptyResult())

            case .notification(let method, let checkout):
                await notificationHandlers[method]?(checkout)
                return nil

            case .request(let id, let method, let checkout):
                if let entry = delegationEntries[method] {
                    return await entry.handler(id, checkout)
                }
                return nil

            case .unknown:
                return nil
            }
        }
    }

    struct DelegationEntry: Sendable {
        let delegation: String
        let handler: @MainActor @Sendable (String, Checkout) async -> String?
    }

    struct EmptyResult: ResponsePayload {}
}
