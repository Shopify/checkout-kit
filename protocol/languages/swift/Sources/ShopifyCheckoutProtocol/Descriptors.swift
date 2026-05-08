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

/// Marker protocol that constrains which types can be used as descriptor payloads.
/// This must be a protocol (not a typealias for `Decodable & Sendable`) so that
/// conformance is explicit — preventing arbitrary types like `[String]` or `Int`
/// from silently matching descriptor generic constraints.
public protocol EventPayload: Decodable, Sendable {}
/// Marker protocol that constrains which types can be used as delegation response payloads.
/// Like `EventPayload`, this must be a protocol (not a typealias) so that conformance
/// is explicit — preventing arbitrary `Encodable & Sendable` types from silently matching.
public protocol ResponsePayload: Encodable, Sendable {}

extension Checkout: EventPayload {}
extension InstrumentsChangeResult: ResponsePayload {}
extension CredentialResult: ResponsePayload {}
public struct ReadyPayload: EventPayload {
    public let delegations: [String]
}

public struct NotificationDescriptor<Payload: EventPayload>: Sendable {
    public let method: String
}

public struct DelegationDescriptor<Payload: EventPayload, Result: ResponsePayload>: Sendable {
    public let method: String
    public let delegation: String
}
