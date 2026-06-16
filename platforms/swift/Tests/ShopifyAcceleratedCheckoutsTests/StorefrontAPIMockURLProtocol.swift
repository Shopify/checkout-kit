import Foundation
@testable import ShopifyCheckoutKit

class StorefrontAPIMockURLProtocol: URLProtocol {
    private struct State {
        var mockResponseData: Data?
        var mockError: Error?
        var mockStatusCode = 200
        var capturedRequest: URLRequest?
        var capturedRequestBody: Data?
    }

    private static let state = LockedValue(State())

    static var mockResponseData: Data? {
        get { state.get().mockResponseData }
        set { state.update { $0.mockResponseData = newValue } }
    }

    static var mockError: Error? {
        get { state.get().mockError }
        set { state.update { $0.mockError = newValue } }
    }

    static var mockStatusCode: Int {
        get { state.get().mockStatusCode }
        set { state.update { $0.mockStatusCode = newValue } }
    }

    static var capturedRequest: URLRequest? {
        get { state.get().capturedRequest }
        set { state.update { $0.capturedRequest = newValue } }
    }

    static var capturedRequestBody: Data? {
        get { state.get().capturedRequestBody }
        set { state.update { $0.capturedRequestBody = newValue } }
    }

    override class func canInit(with _: URLRequest) -> Bool {
        true
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        request
    }

    override func startLoading() {
        Self.capturedRequest = request
        Self.capturedRequestBody = requestBody(for: request)

        if let error = Self.mockError {
            client?.urlProtocol(self, didFailWithError: error)
        } else if let data = Self.mockResponseData {
            let response = HTTPURLResponse(
                url: request.url!,
                statusCode: Self.mockStatusCode,
                httpVersion: nil,
                headerFields: nil
            )!
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
        }
        client?.urlProtocolDidFinishLoading(self)
    }

    override func stopLoading() {}

    static func reset() {
        mockResponseData = nil
        mockError = nil
        mockStatusCode = 200
        capturedRequest = nil
        capturedRequestBody = nil
    }

    private func requestBody(for request: URLRequest) -> Data? {
        guard let bodyStream = request.httpBodyStream else {
            return request.httpBody
        }

        bodyStream.open()
        defer { bodyStream.close() }

        var data = Data()
        let bufferSize = 1024
        let buffer = UnsafeMutablePointer<UInt8>.allocate(capacity: bufferSize)
        defer { buffer.deallocate() }

        while bodyStream.hasBytesAvailable {
            let bytesRead = bodyStream.read(buffer, maxLength: bufferSize)
            if bytesRead > 0 {
                data.append(buffer, count: bytesRead)
            } else {
                break
            }
        }

        return data
    }
}
