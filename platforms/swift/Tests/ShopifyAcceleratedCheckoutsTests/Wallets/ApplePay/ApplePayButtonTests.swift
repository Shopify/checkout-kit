import PassKit
@testable import ShopifyAcceleratedCheckouts
import SwiftUI
import XCTest

@available(iOS 16.0, *)
@MainActor
final class ApplePayButtonTests: XCTestCase {
    func test_cartProvider_afterViewUpdate_shouldInvokeOnlyLatestProvider() async throws {
        guard PKPaymentAuthorizationController.canMakePayments() else {
            throw XCTSkip("Apple Pay is unavailable on this device")
        }

        let providerCalled = expectation(description: "Cart provider called")
        providerCalled.assertForOverFulfill = true
        var requestedSelections: [String] = []

        func makeButton(selection: String, cornerRadius: CGFloat) -> Internal_ApplePayButton {
            Internal_ApplePayButton(
                cartSource: .provider { _ in
                    requestedSelections.append(selection)
                    providerCalled.fulfill()
                    // Exercise cart acquisition without opening a payment sheet or making network requests.
                    return .failed
                },
                buttonType: .plain,
                buttonStyle: .automatic,
                configuration: .testConfiguration,
                cornerRadius: cornerRadius
            )
        }

        let host = UIHostingController(rootView: makeButton(selection: "original", cornerRadius: 8))
        let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 400, height: 200))
        window.rootViewController = host
        window.makeKeyAndVisible()
        defer {
            window.isHidden = true
            window.rootViewController = nil
        }

        host.view.layoutIfNeeded()
        for _ in 0 ..< 20 where findPaymentButton(in: host.view) == nil {
            try await Task.sleep(nanoseconds: 50_000_000)
            host.view.layoutIfNeeded()
        }
        let paymentButton = try XCTUnwrap(findPaymentButton(in: host.view))

        host.rootView = makeButton(selection: "updated", cornerRadius: 14)
        // Wait for an observable updateUIView change before sending the tap.
        for _ in 0 ..< 20 where paymentButton.cornerRadius != 14 {
            try await Task.sleep(nanoseconds: 50_000_000)
            host.view.layoutIfNeeded()
        }
        XCTAssertEqual(paymentButton.cornerRadius, 14)
        XCTAssertTrue(findPaymentButton(in: host.view) === paymentButton, "The existing UIKit button should be updated, not recreated")

        paymentButton.sendActions(for: .touchUpInside)
        await fulfillment(of: [providerCalled], timeout: 2)

        XCTAssertEqual(requestedSelections, ["updated"])
    }

    func test_cartProvider_whilePending_shouldIgnoreRepeatedTapsAndAllowRetryAfterFailure() async throws {
        guard PKPaymentAuthorizationController.canMakePayments() else {
            throw XCTSkip("Apple Pay is unavailable on this device")
        }

        let providerStarted = expectation(description: "First provider request started")
        let retried = expectation(description: "Provider called for retry")
        var pending: CheckedContinuation<CartResult, Never>?
        var providerCalls = 0
        var isPending = true
        let button = Internal_ApplePayButton(
            cartSource: .provider { _ in
                providerCalls += 1
                if providerCalls == 1 {
                    return await withCheckedContinuation {
                        pending = $0
                        providerStarted.fulfill()
                    }
                }
                if !isPending {
                    retried.fulfill()
                }
                return .failed
            },
            buttonType: .plain,
            buttonStyle: .automatic,
            configuration: .testConfiguration,
            cornerRadius: nil
        )
        let host = UIHostingController(rootView: button)
        let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 400, height: 200))
        window.rootViewController = host
        window.makeKeyAndVisible()
        defer {
            pending?.resume(returning: .failed)
            window.isHidden = true
            window.rootViewController = nil
        }
        host.view.layoutIfNeeded()
        for _ in 0 ..< 20 where findPaymentButton(in: host.view) == nil {
            try await Task.sleep(nanoseconds: 50_000_000)
            host.view.layoutIfNeeded()
        }
        let paymentButton = try XCTUnwrap(findPaymentButton(in: host.view))
        paymentButton.sendActions(for: .touchUpInside)
        await fulfillment(of: [providerStarted], timeout: 2)

        paymentButton.sendActions(for: .touchUpInside)
        paymentButton.sendActions(for: .touchUpInside)
        try await Task.sleep(nanoseconds: 100_000_000)
        XCTAssertEqual(providerCalls, 1)

        isPending = false
        let continuation = try XCTUnwrap(pending)
        pending = nil
        continuation.resume(returning: .failed)
        try await Task.sleep(nanoseconds: 100_000_000)

        paymentButton.sendActions(for: .touchUpInside)
        await fulfillment(of: [retried], timeout: 2)
        XCTAssertEqual(providerCalls, 2)
    }

    private func findPaymentButton(in view: UIView) -> PKPaymentButton? {
        if let button = view as? PKPaymentButton {
            return button
        }
        return view.subviews.lazy.compactMap { self.findPaymentButton(in: $0) }.first
    }
}
