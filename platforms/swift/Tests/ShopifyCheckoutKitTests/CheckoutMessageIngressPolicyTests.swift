@testable import ShopifyCheckoutKit
import XCTest

final class CheckoutMessageIngressPolicyTests: XCTestCase {
    private let checkoutURL = URL(string: "https://checkout.example.com/cart")!

    func testOpenByDefaultAcceptsAnyMainFrameOrigin() {
        let policy = CheckoutMessageIngressPolicy(
            configuredOrigins: [],
            checkoutURL: checkoutURL
        )
        var didResolveOrigin = false
        var didResolveRequestURL = false

        XCTAssertEqual(
            policy.evaluate(
                message(
                    origin: "https://untrusted.example.com",
                    didResolveOrigin: { didResolveOrigin = true },
                    didResolveRequestURL: { didResolveRequestURL = true }
                )
            ),
            .accepted
        )
        XCTAssertFalse(didResolveOrigin)
        XCTAssertFalse(didResolveRequestURL)
    }

    func testChildFrameIsRejectedBeforeOriginEvaluation() {
        let policy = CheckoutMessageIngressPolicy(
            configuredOrigins: [],
            checkoutURL: checkoutURL
        )

        XCTAssertEqual(
            policy.evaluate(message(origin: "https://checkout.example.com", isMainFrame: false)),
            .rejected(
                CheckoutMessageRejection(
                    origin: "https://checkout.example.com",
                    reason: .childFrame
                )
            )
        )
    }

    func testExplicitPortZeroIsRejectedWhenOriginValidationIsEnabled() throws {
        let policy = CheckoutMessageIngressPolicy(
            configuredOrigins: ["https://trusted.example.com"],
            checkoutURL: checkoutURL
        )

        XCTAssertEqual(
            try policy.evaluate(
                message(
                    origin: "https://trusted.example.com",
                    requestURL: XCTUnwrap(URL(string: "https://trusted.example.com:0"))
                )
            ),
            .rejected(
                CheckoutMessageRejection(
                    origin: "https://trusted.example.com",
                    reason: .unsupportedPort
                )
            )
        )
    }

    func testOriginOutsideAllowlistIsRejected() {
        let policy = CheckoutMessageIngressPolicy(
            configuredOrigins: ["https://trusted.example.com"],
            checkoutURL: checkoutURL
        )

        XCTAssertEqual(
            policy.evaluate(message(origin: "https://untrusted.example.com")),
            .rejected(
                CheckoutMessageRejection(
                    origin: "https://untrusted.example.com",
                    reason: .originNotAllowed
                )
            )
        )
    }

    private func message(
        origin: String,
        requestURL: URL? = nil,
        isMainFrame: Bool = true,
        didResolveOrigin: @escaping () -> Void = {},
        didResolveRequestURL: @escaping () -> Void = {}
    ) -> IncomingCheckoutMessage {
        let url = URL(string: origin)!
        return IncomingCheckoutMessage(
            body: "{}",
            isMainFrame: isMainFrame,
            resolveOrigin: {
                didResolveOrigin()
                return MessageOrigin(scheme: url.scheme!, host: url.host!, port: url.port)
            },
            resolveRequestURL: {
                didResolveRequestURL()
                return requestURL ?? url
            }
        )
    }
}
