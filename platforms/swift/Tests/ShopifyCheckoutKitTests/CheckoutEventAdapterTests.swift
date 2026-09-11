import EmbeddedCheckoutProtocol
@testable import ShopifyCheckoutKit
import XCTest

@MainActor
final class CheckoutEventAdapterTests: XCTestCase {
    func testStartProducesNormalizedCheckout() async {
        let sink = RecordingCheckoutEventSink()
        let adapter = CheckoutEventAdapter(sink: sink)

        _ = await adapter.process(message(method: "ec.start", status: "incomplete"))

        let checkout = try? XCTUnwrap(sink.started.first)
        XCTAssertEqual(checkout?.id, "checkout-1")
        XCTAssertEqual(checkout?.currency, "USD")
        XCTAssertEqual(checkout?.status, .incomplete)
        XCTAssertEqual(checkout?.buyer?.email, "buyer@example.com")
    }

    func testCheckoutPreservesProtocolShapeExceptUCP() throws {
        let envelopeData = try XCTUnwrap(fullCheckoutMessage.data(using: .utf8))
        let envelope = try XCTUnwrap(JSONSerialization.jsonObject(with: envelopeData) as? [String: Any])
        let params = try XCTUnwrap(envelope["params"] as? [String: Any])
        let protocolObject = try XCTUnwrap(params["checkout"] as? [String: Any])
        let protocolData = try JSONSerialization.data(withJSONObject: protocolObject)
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let checkout = try decoder.decode(ShopifyCheckoutKit.Checkout.self, from: protocolData)
        XCTAssertEqual(checkout.attribution, ["source": "agent"])
        XCTAssertEqual(checkout.context?.addressCountry, "IE")
        XCTAssertEqual(checkout.continueURL, "https://example.com/continue")
        XCTAssertEqual(checkout.expiresAt, ISO8601DateFormatter().date(from: "2026-09-11T12:00:00Z"))
        XCTAssertEqual(checkout.links.first?.type, "privacy_policy")
        XCTAssertEqual(checkout.messages?.first?.code, "notice")
        XCTAssertEqual(checkout.signals?["com.example.trusted"]?.value as? Bool, true)

        XCTAssertEqual(checkout.discounts?.codes, ["SAVE10"])
        XCTAssertEqual(checkout.discounts?.applied?.first?.allocations?.first?.path, "$.line_items[0]")
        XCTAssertEqual(checkout.discounts?.applied?.first?.eligibility, "com.example.member")
        XCTAssertEqual(checkout.discounts?.applied?.first?.method, .across)
        XCTAssertEqual(checkout.discounts?.applied?.first?.priority, 1)

        XCTAssertEqual(checkout.lineItems.first?.parentID, "parent-1")
        XCTAssertEqual(checkout.lineItems.first?.item.imageURL, "https://example.com/item.png")
        XCTAssertEqual(checkout.totals.first?.lines?.first?.displayText, "State tax")

        let method = checkout.fulfillment?.methods?.first
        XCTAssertEqual(method?.destinations?.first?.streetAddress, "1 Main Street")
        XCTAssertEqual(method?.groups?.first?.selectedOptionID, "option-1")
        XCTAssertEqual(method?.groups?.first?.options?.first?.carrier, "Post")

        let instrument = checkout.payment?.instruments?.first
        XCTAssertEqual(instrument?.billingAddress?.postalCode, "D02")
        XCTAssertEqual(instrument?.credential?.type, "token")
        XCTAssertEqual(instrument?.credential?.additionalProperties["value"]?.value as? String, "synthetic-placeholder")
        XCTAssertEqual(instrument?.display?["last_digits"]?.value as? String, "4242")
        XCTAssertNil(instrument?.selected)
        XCTAssertEqual(checkout.order?.permalinkURL, "https://example.com/orders/1")
        let extensionValue = checkout.additionalProperties["com.example.extension"]?.value as? [String: Any]
        XCTAssertEqual(extensionValue?["enabled"] as? Bool, true)

        let encoded = try JSONEncoder().encode(checkout)
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: encoded) as? [String: Any])
        XCTAssertNil(object["ucp"])
        XCTAssertNotNil(object["com.example.extension"])
    }

    func testEveryChangeNotificationProducesOneUpdate() async {
        let methods = [
            "ec.line_items.change",
            "ec.messages.change",
            "ec.totals.change",
            "ec.fulfillment.change"
        ]

        for (index, method) in methods.enumerated() {
            let sink = RecordingCheckoutEventSink()
            let adapter = CheckoutEventAdapter(sink: sink)
            _ = await adapter.process(message(method: method, total: index))
            XCTAssertEqual(sink.updated.count, 1, method)
        }
    }

    func testUnsupportedChangeNotificationsDoNotProduceUpdates() async {
        for method in ["ec.buyer.change", "ec.payment.change"] {
            let sink = RecordingCheckoutEventSink()
            let adapter = CheckoutEventAdapter(sink: sink)

            _ = await adapter.process(message(method: method))

            XCTAssertTrue(sink.updated.isEmpty, method)
        }
    }

    func testEqualUpdateSnapshotsAreDeduplicated() async {
        let sink = RecordingCheckoutEventSink()
        let adapter = CheckoutEventAdapter(sink: sink)
        let update = message(method: "ec.totals.change")

        _ = await adapter.process(update)
        _ = await adapter.process(update)

        XCTAssertEqual(sink.updated.count, 1)
    }

    func testCompleteProducesCompleteEventEvenWhenSnapshotIsUnchanged() async {
        let sink = RecordingCheckoutEventSink()
        let adapter = CheckoutEventAdapter(sink: sink)

        _ = await adapter.process(message(method: "ec.start", status: "completed"))
        _ = await adapter.process(message(method: "ec.complete", status: "completed"))

        XCTAssertEqual(sink.completed.count, 1)
    }

    func testProtocolMessagesDoNotAddDerivedLineItemState() async throws {
        let sink = RecordingCheckoutEventSink()
        let adapter = CheckoutEventAdapter(sink: sink)

        _ = await adapter.process(message(
            method: "ec.messages.change",
            messages: #"[{"type":"error","code":"out_of_stock","content":"Unavailable"}]"#
        ))

        let checkout = try XCTUnwrap(sink.updated.first)
        XCTAssertTrue(checkout.lineItems.isEmpty)
    }

    private func message(
        method: String,
        status: String = "incomplete",
        total: Int = 1000,
        messages: String = "[]"
    ) -> String {
        """
        {"jsonrpc":"2.0","method":"\(method)","params":{"checkout":{
          "buyer":{"email":"buyer@example.com","first_name":"Ada","last_name":"Lovelace"},
          "currency":"USD",
          "id":"checkout-1",
          "line_items":[],
          "links":[{"type":"privacy_policy","url":"https://example.com/privacy"}],
          "messages":\(messages),
          "status":"\(status)",
          "totals":[{"amount":\(total),"type":"total"}],
          "ucp":{"payment_handlers":{},"version":"\(EmbeddedCheckoutProtocol.specVersion)"}
        }}}
        """
    }

    private var fullCheckoutMessage: String {
        """
        {"jsonrpc":"2.0","method":"ec.start","params":{"checkout":{
          "attribution":{"source":"agent"},
          "buyer":{"email":"buyer@example.com","first_name":"Ada","last_name":"Lovelace","phone_number":"+353123456789"},
          "context":{"address_country":"IE","address_region":"D","currency":"EUR","eligibility":["com.example.member"],"intent":"gift","language":"en-IE","postal_code":"D02"},
          "continue_url":"https://example.com/continue",
          "currency":"EUR",
          "discounts":{"codes":["SAVE10"],"applied":[{"allocations":[{"amount":100,"path":"$.line_items[0]"}],"amount":100,"automatic":false,"code":"SAVE10","eligibility":"com.example.member","method":"across","priority":1,"provisional":true,"title":"Save ten"}]},
          "expires_at":"2026-09-11T12:00:00Z",
          "fulfillment":{"available_methods":[{"description":"Available now","fulfillable_on":"now","line_item_ids":["line-1"],"type":"shipping"}],"methods":[{"destinations":[{"id":"destination-1","street_address":"1 Main Street","address_locality":"Dublin","address_country":"IE"}],"groups":[{"id":"group-1","line_item_ids":["line-1"],"options":[{"carrier":"Post","description":"Tomorrow","earliest_fulfillment_time":"2026-09-12T09:00:00Z","id":"option-1","latest_fulfillment_time":"2026-09-12T17:00:00Z","title":"Standard","totals":[{"amount":500,"display_text":"Shipping","type":"fulfillment"}]}],"selected_option_id":"option-1"}],"id":"method-1","line_item_ids":["line-1"],"selected_destination_id":"destination-1","type":"shipping"}]},
          "id":"checkout-1",
          "line_items":[{"id":"line-1","item":{"id":"variant-1","image_url":"https://example.com/item.png","price":1000,"title":"Item"},"parent_id":"parent-1","quantity":1,"totals":[{"amount":1000,"display_text":"Item total","type":"total"}]}],
          "links":[{"title":"Privacy","type":"privacy_policy","url":"https://example.com/privacy"}],
          "messages":[{"code":"notice","content":"Review this","content_type":"plain","path":"$.line_items[0]","severity":"requires_buyer_review","type":"warning","image_url":"https://example.com/warning.png","presentation":"notice","url":"https://example.com/help"}],
          "order":{"id":"order-1","label":"#1001","permalink_url":"https://example.com/orders/1"},
          "payment":{"instruments":[{"billing_address":{"address_country":"IE","address_locality":"Dublin","address_region":"D","extended_address":"Apt 1","first_name":"Ada","last_name":"Lovelace","phone_number":"+353123456789","postal_code":"D02","street_address":"1 Main Street"},"credential":{"type":"token","value":"synthetic-placeholder"},"display":{"last_digits":"4242"},"handler_id":"handler-1","id":"instrument-1","type":"card"}]},
          "signals":{"com.example.trusted":true},
          "status":"requires_escalation",
          "totals":[{"amount":1100,"display_text":"Total","type":"total","lines":[{"amount":100,"display_text":"State tax"}]}],
          "com.example.extension":{"enabled":true},
          "ucp":{"payment_handlers":{},"version":"\(EmbeddedCheckoutProtocol.specVersion)"}
        }}}
        """
    }
}

@MainActor
private final class RecordingCheckoutEventSink: CheckoutEventSink {
    var started: [ShopifyCheckoutKit.Checkout] = []
    var updated: [ShopifyCheckoutKit.Checkout] = []
    var completed: [ShopifyCheckoutKit.Checkout] = []

    func checkoutDidStart(_ checkout: ShopifyCheckoutKit.Checkout) {
        started.append(checkout)
    }

    func checkoutDidUpdate(_ checkout: ShopifyCheckoutKit.Checkout) {
        updated.append(checkout)
    }

    func checkoutDidComplete(_ checkout: ShopifyCheckoutKit.Checkout) {
        completed.append(checkout)
    }
}
