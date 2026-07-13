import Foundation

extension EmbeddedCheckoutProtocol {
    public typealias DecodeErrorHandler = @Sendable (_ method: String, _ error: Error) -> Void

    public struct Client: Sendable, MutableCopyable {
        private var notificationHandlers: [String: @MainActor @Sendable (Data, DecodeErrorHandler?) -> Void]
        private var requestEntries: [String: RequestEntry]
        private var decodeErrorHandler: DecodeErrorHandler?

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
        public func onDecodeError(_ handler: @escaping DecodeErrorHandler) -> Client {
            return copy {
                $0.decodeErrorHandler = handler
            }
        }

        @discardableResult
        public func on<P: EventPayload, Handler>(
            _ descriptor: NotificationDescriptor<P, Handler>,
            perform: @escaping @MainActor (Handler) -> Void
        ) -> Client {
            return copy {
                $0.notificationHandlers[descriptor.method] = { params, onDecodeError in
                    let payload: P
                    do {
                        payload = try descriptor.decode(params)
                    } catch {
                        onDecodeError?(descriptor.method, error)
                        return
                    }
                    let message = NotificationMessage(method: descriptor.method, params: payload)
                    perform(descriptor.project(message))
                }
            }
        }

        @discardableResult
        public func on<P: EventPayload, Handler, R: ResponsePayload>(
            _ descriptor: RequestDescriptor<P, Handler, R>,
            perform: @escaping @MainActor @Sendable (Handler) async -> R
        ) -> Client {
            return copy {
                $0.requestEntries[descriptor.method] = RequestEntry(
                    delegation: descriptor.delegation,
                    handler: { id, params, onDecodeError in
                        let payload: P
                        do {
                            payload = try descriptor.decode(params)
                        } catch {
                            onDecodeError?(descriptor.method, error)
                            return EmbeddedCheckoutProtocol.encodeErrorResponse(
                                id: id,
                                code: EmbeddedCheckoutProtocol.invalidParamsCode,
                                message: EmbeddedCheckoutProtocol.invalidParamsMessage
                            )
                        }
                        let message = RequestMessage(method: descriptor.method, id: id, params: payload)
                        let result = await perform(descriptor.project(message))
                        return EmbeddedCheckoutProtocol.encodeResponse(id: id, result: result)
                    }
                )
            }
        }

        public func process(_ message: String) async -> String? {
            let decoded = EmbeddedCheckoutProtocol.decode(jsonRpc: message)

            switch decoded {
            case let .notification(method, params):
                await notificationHandlers[method]?(params, decodeErrorHandler)
                return nil

            case let .request(id, method, params):
                guard let entry = requestEntries[method] else { return nil }
                return await entry.handler(id, params, decodeErrorHandler)

            case .unknown:
                return nil
            }
        }
    }

    struct RequestEntry {
        let delegation: String?
        let handler: @MainActor @Sendable (JSONRPCID, Data, DecodeErrorHandler?) async -> String?
    }
}
