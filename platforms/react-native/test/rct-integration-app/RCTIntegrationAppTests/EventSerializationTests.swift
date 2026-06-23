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
}
