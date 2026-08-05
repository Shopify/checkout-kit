import Foundation
@testable import RNShopifyCheckoutKit
import ShopifyCheckoutKit
import XCTest

@available(iOS 16.0, *)
class EventSerializationTests: XCTestCase {
    // MARK: - RenderState

    func testRenderStateSerialization_includesErrorReason() {
        let serialized = ShopifyEventSerialization.serialize(renderState: .error(reason: "invariant_violation"))
        XCTAssertEqual(serialized["state"], "error")
        XCTAssertEqual(serialized["reason"], "invariant_violation")
    }

    func testRenderStateSerialization_includesEmptyErrorReason() {
        let serialized = ShopifyEventSerialization.serialize(renderState: .error(reason: ""))
        XCTAssertEqual(serialized["state"], "error")
        XCTAssertEqual(serialized["reason"], "")
    }

    func testRenderStateSerialization_loadingAndRendered() {
        let loading = ShopifyEventSerialization.serialize(renderState: .loading)
        XCTAssertEqual(loading["state"], "loading")
        XCTAssertNil(loading["reason"])

        let rendered = ShopifyEventSerialization.serialize(renderState: .rendered)
        XCTAssertEqual(rendered["state"], "rendered")
        XCTAssertNil(rendered["reason"])
    }

    // MARK: - Click event

    func testClickEventSerialization() throws {
        let url = try XCTUnwrap(URL(string: "https://shopify.dev/test"))
        let serialized = ShopifyEventSerialization.serialize(clickEvent: url)
        XCTAssertEqual(serialized["url"], url)
    }

    // MARK: - Checkout error

    func testCheckoutErrorSerialization_carriesFlattenedFields() {
        let serialized = ShopifyEventSerialization.serialize(
            checkoutError: CheckoutError(code: .cartExpired, message: "expired")
        )

        XCTAssertEqual(serialized["code"] as? String, "cart_expired")
        XCTAssertEqual(serialized["message"] as? String, "expired")
        XCTAssertNil(serialized["statusCode"])
        XCTAssertNil(serialized["__typename"])
    }

    func testCheckoutErrorSerialization_addsStatusCodeForHTTPFailures() {
        let serialized = ShopifyEventSerialization.serialize(
            checkoutError: CheckoutError(code: .httpError, message: "Not Found", httpStatusCode: 404)
        )

        XCTAssertEqual(serialized["code"] as? String, "http_error")
        XCTAssertEqual(serialized["message"] as? String, "Not Found")
        XCTAssertEqual(serialized["statusCode"] as? Int, 404)
    }

    /// Locks the wire format shared with Android's
    /// `CustomCheckoutListener.populateErrorDetails`, which sends the
    /// lower-snake-case enum constant name.
    func testCheckoutErrorSerialization_everyCodeUsesTheSharedWireName() {
        for code in CheckoutErrorCode.allCases {
            let serialized = ShopifyEventSerialization.serialize(
                checkoutError: CheckoutError(code: code, message: "failed")
            )
            XCTAssertEqual(serialized["code"] as? String, code.rawValue)
        }
    }

    /// Fails when the native SDK gains a code that the JS `CheckoutErrorCode` does not declare.
    func testEveryNativeErrorCodeIsDeclaredInTheJavaScriptEnum() throws {
        let errorsFile = try XCTUnwrap(
            Self.errorsFileURL(),
            "Found no \(Self.relativeErrorsPath) above \(#filePath)"
        )
        let declaredCodes = try Self.declaredCodes(in: String(contentsOf: errorsFile, encoding: .utf8))

        XCTAssertFalse(declaredCodes.isEmpty, "Found no CheckoutErrorCode members in \(errorsFile.path)")

        let missingCodes = CheckoutErrorCode.allCases
            .map(\.rawValue)
            .filter { !declaredCodes.contains($0) }

        XCTAssertTrue(
            missingCodes.isEmpty,
            "\(errorsFile.path) omits \(missingCodes). Add each code to CheckoutErrorCode there."
        )
    }

    private static let relativeErrorsPath = "modules/@shopify/checkout-kit-react-native/src/errors.ts"

    private static func errorsFileURL() -> URL? {
        var directory = URL(fileURLWithPath: #filePath).deletingLastPathComponent()

        while directory.path != "/" {
            let candidate = directory.appendingPathComponent(relativeErrorsPath)
            if FileManager.default.fileExists(atPath: candidate.path) {
                return candidate
            }
            directory = directory.deletingLastPathComponent()
        }

        return nil
    }

    private static func declaredCodes(in source: String) -> Set<String> {
        var codes: Set<String> = []

        for line in source.split(separator: "\n") where line.contains(" = '") {
            let quoted = line.split(separator: "'", omittingEmptySubsequences: false)
            guard quoted.count >= 3, !quoted[1].isEmpty else {
                continue
            }
            codes.insert(String(quoted[1]))
        }

        return codes
    }
}
