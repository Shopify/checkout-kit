import Foundation

extension ReadyRequest: EventPayload {}
extension ReadyResult: ResponsePayload {}

extension EmbeddedCheckoutProtocol {
    public static let ready = RequestDescriptor<ReadyRequest, ReadyResult>(
        method: Event.ready.method,
        delegation: nil,
        decode: { try? JSONDecoder().decode(ReadyRequest.self, from: $0) }
    )
}
