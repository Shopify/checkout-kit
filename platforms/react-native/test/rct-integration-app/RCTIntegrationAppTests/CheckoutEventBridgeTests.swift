import Foundation
@testable import RNShopifyCheckoutKit
import ShopifyCheckoutKit
import XCTest

@MainActor
final class CheckoutEventBridgeTests: XCTestCase {
    private func checkout() throws -> Checkout {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let value = try container.decode(String.self)
            return try Date(value, strategy: Date.ISO8601FormatStyle(includingFractionalSeconds: true))
        }
        return try decoder.decode(Checkout.self, from: Data(snapshot.utf8))
    }

    func testSnapshotPreservesWireFieldsAndExtensionsWithoutMetadata() throws {
        let json = try XCTUnwrap(checkoutEventJSON(type: .start, checkout: checkout(), requestId: "request-1"))
        let envelope = try parse(json)
        XCTAssertEqual(envelope["type"] as? String, "start")
        XCTAssertEqual(envelope["requestId"] as? String, "request-1")
        let payload = try XCTUnwrap(envelope["payload"] as? [String: Any])
        let checkout = try XCTUnwrap(payload["checkout"] as? [String: Any])
        XCTAssertNil(checkout["ucp"])
        XCTAssertNotNil(checkout["line_items"])
        XCTAssertNotNil(checkout["actions"])
        XCTAssertNotNil(checkout["policies"])
        XCTAssertEqual(checkout["expires_at"] as? String, "2026-09-25T12:00:00.123Z")
        XCTAssertEqual((checkout["custom_extension"] as? [String: Bool])?["nested_key"], true)
    }

    func testCompletionDoesNotReleaseCallbacks() throws {
        var events: [String] = []
        var terminalCount = 0
        let bridge = CheckoutEventBridge(requestId: "request-1", linkAction: "open", dispatch: { events.append($0) }, onTerminal: { terminalCount += 1 })
        let checkout = try checkout()
        bridge.checkoutDidStart(CheckoutStartEvent(checkout: checkout))
        bridge.checkoutDidUpdate(CheckoutUpdateEvent(checkout: checkout))
        bridge.checkoutDidComplete(CheckoutCompleteEvent(checkout: checkout))
        XCTAssertEqual(terminalCount, 0)
        bridge.checkoutDidDismiss()
        bridge.checkoutDidUpdate(CheckoutUpdateEvent(checkout: checkout))
        bridge.checkoutDidDismiss()
        XCTAssertEqual(terminalCount, 1)
        XCTAssertEqual(try events.map { try parse($0)["type"] as? String }, ["start", "update", "complete", "dismiss"])
    }

    func testFailureUsesErrorEventAndReleasesCallbacks() throws {
        var events: [String] = []
        let bridge = CheckoutEventBridge(requestId: "request-1", linkAction: "open", dispatch: { events.append($0) }, onTerminal: {})
        bridge.checkoutDidFail(CheckoutFailureEvent(error: CheckoutError(code: .sdkError, message: "Failed")))
        bridge.checkoutDidDismiss()
        let envelope = try parse(XCTUnwrap(events.first))
        let payload = try XCTUnwrap(envelope["payload"] as? [String: Any])
        let error = try XCTUnwrap(payload["error"] as? [String: Any])
        XCTAssertEqual(error["code"] as? String, "sdk_error")
        XCTAssertEqual(events.count, 1)
    }

    func testLinkActionNotifiesAndReturnsSynchronousPolicy() throws {
        for action in ["open", "handled", "cancel"] {
            var events: [String] = []
            let bridge = CheckoutEventBridge(requestId: "request-1", linkAction: action, dispatch: { events.append($0) }, onTerminal: {})
            let link = try CheckoutLink(url: XCTUnwrap(URL(string: "https://example.test/policy")))
            XCTAssertEqual(bridge.checkoutAction(for: link), checkoutLinkAction(action))
            let envelope = try parse(XCTUnwrap(events.first))
            XCTAssertEqual(envelope["type"] as? String, "linkClick")
            XCTAssertEqual((envelope["payload"] as? [String: String])?["url"], "https://example.test/policy")
        }
    }

    func testReplacingCallbacksRetainsTheNativeSession() throws {
        var events: [String] = []
        let bridge = CheckoutEventBridge(requestId: "old", linkAction: "open", dispatch: { events.append($0) }, onTerminal: {})
        bridge.requestId = "new"
        try bridge.checkoutDidUpdate(CheckoutUpdateEvent(checkout: checkout()))
        XCTAssertEqual(try parse(XCTUnwrap(events.first))["requestId"] as? String, "new")
    }

    private func parse(_ json: String) throws -> [String: Any] {
        try XCTUnwrap(JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any])
    }
}

private let snapshot = #"""
{"id":"checkout-1","currency":"USD","status":"incomplete",
 "line_items":[],"links":[],"totals":[],
 "expires_at":"2026-09-25T12:00:00.123Z",
 "actions":{"com.example.verify":[{"config":{"custom_key":true}}]},
 "policies":[{"id":"policy-1","type":"return","description":{"plain":"Returns accepted"},"applies_to":["$.line_items[0]"]}],
 "custom_extension":{"nested_key":true}}
"""#
