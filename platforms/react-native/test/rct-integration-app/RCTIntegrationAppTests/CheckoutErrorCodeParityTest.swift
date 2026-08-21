import Foundation
import ShopifyCheckoutKit
import XCTest

/// Fails when the native SDK gains a code that the JS `CheckoutErrorCode` does not declare.
///
/// The JavaScript members come from `scripts/print-error-codes.mjs`, the same script
/// `CheckoutErrorCodeParityTest.kt` runs. `Process` is unavailable on iOS, so `test_ios`
/// runs node before `xcodebuild` and exports the result to this process.
///
/// This app resolves the published pod pinned at `checkoutKit.nativeSdkVersions`, not
/// `platforms/swift/`. An in-repo enum change reaches this test when that version bumps.
final class CheckoutErrorCodeParityTest: XCTestCase {
    func testEveryIOSErrorCodeIsDeclaredInTheJavaScriptEnum() throws {
        let exportedCodes = try Self.exportedWireValues()

        XCTAssertFalse(
            exportedCodes.isEmpty,
            "\(Self.relativeErrorsPath) exports no CheckoutErrorCode members"
        )

        let missingCodes = CheckoutErrorCode.allCases
            .map(\.rawValue)
            .filter { !exportedCodes.contains($0) }

        XCTAssertEqual(
            missingCodes,
            [],
            "\(Self.relativeErrorsPath) omits \(missingCodes). Add each code to CheckoutErrorCode there."
        )
    }

    private static func exportedWireValues() throws -> Set<String> {
        let exported = try XCTUnwrap(
            ProcessInfo.processInfo.environment[environmentKey],
            codesUnavailableMessage
        )

        return Set(try JSONDecoder().decode([String].self, from: Data(exported.utf8)))
    }

    private static let relativeErrorsPath = "src/errors.ts"
    private static let environmentKey = "JS_CHECKOUT_ERROR_CODES"
    private static let codesUnavailableMessage =
        "\(environmentKey) is unset. Run `dev rn test ios`, which exports it from scripts/print-error-codes.mjs."
}
