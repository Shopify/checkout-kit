import Foundation

extension EmbeddedCheckoutProtocol {
    public struct Client: Sendable, MutableCopyable {
        private var notificationHandlers: [String: @MainActor @Sendable (any EventPayload) -> Void]
        private var requestEntries: [String: RequestEntry]

        /// The delegation strings this client can fulfill, derived from the
        /// registered request handlers that carry a delegation. Core requests
        /// (`ec.ready`, `ec.auth`) have no delegation and are excluded.
        var delegations: [String] {
            requestEntries.values.compactMap(\.delegation)
        }

        public init() {
            notificationHandlers = [:]
            requestEntries = [:]
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
            _ descriptor: RequestDescriptor<P, R>,
            perform: @escaping @MainActor @Sendable (P) async -> R
        ) -> Client {
            return copy {
                $0.requestEntries[descriptor.method] = RequestEntry(
                    delegation: descriptor.delegation,
                    handler: { id, params in
                        guard let payload = descriptor.decode(params) else {
                            return EmbeddedCheckoutProtocol.encodeErrorResponse(
                                id: id,
                                code: EmbeddedCheckoutProtocol.invalidParamsCode,
                                message: EmbeddedCheckoutProtocol.invalidParamsMessage
                            )
                        }
                        let result = await perform(payload)
                        return EmbeddedCheckoutProtocol.encodeResponse(id: id, result: result)
                    }
                )
            }
        }

        public func process(_ message: String) async -> String? {
            let decoded = EmbeddedCheckoutProtocol.decode(jsonRpc: message)

            switch decoded {
            case let .notification(method, payload):
                await notificationHandlers[method]?(payload)
                return nil

            case let .request(id, method, params):
                guard let entry = requestEntries[method] else { return nil }
                return await entry.handler(id, params)

            case .unknown:
                return nil
            }
        }
    }

    struct RequestEntry {
        let delegation: String?
        let handler: @MainActor @Sendable (JSONRPCID, Data) async -> String?
    }
}
