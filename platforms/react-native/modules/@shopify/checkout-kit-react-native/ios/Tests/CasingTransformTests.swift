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

import Foundation
@testable import RNShopifyCheckoutKitCasingTransform
import Testing

@Suite("Casing Transform Tests")
struct CasingTransformTests {
    @Test func snakeToCamelConvertsSingleUnderscore() {
        #expect(CasingTransform.snakeToCamel("continue_url") == "continueUrl")
    }

    @Test func snakeToCamelConvertsLineItems() {
        #expect(CasingTransform.snakeToCamel("line_items") == "lineItems")
    }

    @Test func snakeToCamelConvertsImageUrl() {
        #expect(CasingTransform.snakeToCamel("image_url") == "imageUrl")
    }

    @Test func snakeToCamelLeavesNonSnakeUnchanged() {
        #expect(CasingTransform.snakeToCamel("foo") == "foo")
    }

    @Test func snakeToCamelHandlesEmptyString() {
        #expect(CasingTransform.snakeToCamel("") == "")
    }

    @Test func snakeToCamelConvertsMultipleUnderscores() {
        #expect(CasingTransform.snakeToCamel("a_b_c") == "aBC")
    }

    @Test func snakeToCamelConvertsLongMultiSegmentField() {
        #expect(CasingTransform.snakeToCamel("accelerated_checkouts_apple_pay_configuration") == "acceleratedCheckoutsApplePayConfiguration")
    }

    @Test func snakeToCamelConvertsOAuthAccessToken() {
        #expect(CasingTransform.snakeToCamel("oauth_2_0_access_token") == "oauth20AccessToken")
    }

    @Test func snakeToCamelConvertsHttpRequestFinish() {
        #expect(CasingTransform.snakeToCamel("http_request_finish") == "httpRequestFinish")
    }

    @Test func snakeToCamelConvertsIso8601Timestamp() {
        #expect(CasingTransform.snakeToCamel("iso_8601_timestamp") == "iso8601Timestamp")
    }

    @Test func snakeToCamelConvertsXForwardedForHeader() {
        #expect(CasingTransform.snakeToCamel("x_forwarded_for_header") == "xForwardedForHeader")
    }

    @Test func snakeToCamelLeavesAlreadyCamelInputUnchanged() {
        #expect(CasingTransform.snakeToCamel("alreadyCamel") == "alreadyCamel")
    }

    @Test func snakeToCamelTreatsNumbersAsNonSpecialCharacters() {
        #expect(CasingTransform.snakeToCamel("field_v2") == "fieldV2")
    }

    @Test func camelToSnakeConvertsContinueUrl() {
        #expect(CasingTransform.camelToSnake("continueUrl") == "continue_url")
    }

    @Test func camelToSnakeConvertsLineItems() {
        #expect(CasingTransform.camelToSnake("lineItems") == "line_items")
    }

    @Test func camelToSnakeLeavesLowercaseUnchanged() {
        #expect(CasingTransform.camelToSnake("foo") == "foo")
    }

    @Test func camelToSnakeHandlesEmptyString() {
        #expect(CasingTransform.camelToSnake("") == "")
    }

    @Test func camelToSnakeConvertsAcceleratedCheckoutsApplePayConfiguration() {
        #expect(CasingTransform.camelToSnake("acceleratedCheckoutsApplePayConfiguration") == "accelerated_checkouts_apple_pay_configuration")
    }

    @Test func camelToSnakeConvertsHttpRequestFinish() {
        #expect(CasingTransform.camelToSnake("httpRequestFinish") == "http_request_finish")
    }

    @Test func camelToSnakeConvertsXForwardedForHeader() {
        #expect(CasingTransform.camelToSnake("xForwardedForHeader") == "x_forwarded_for_header")
    }

    @Test func camelToSnakeSplitsEachConsecutiveUppercaseCharacter() {
        #expect(CasingTransform.camelToSnake("imageURL") == "image_u_r_l")
    }

    @Test func snakeToCamelRoundTripsTypicalWireKeys() {
        let keys = [
            "continue_url",
            "line_items",
            "image_url",
            "http_request_finish",
            "accelerated_checkouts_apple_pay_configuration",
            "x_forwarded_for_header"
        ]
        for key in keys {
            #expect(CasingTransform.camelToSnake(CasingTransform.snakeToCamel(key)) == key)
        }
    }

    @Test func transformKeysRecursesNestedDictionariesAndArrays() throws {
        let input: [String: Any] = [
            "outer_key": [
                "inner_key": "value",
                "nested_list": [
                    ["item_id": "1"],
                    ["item_id": "2"]
                ]
            ]
        ]

        let result = try #require(
            CasingTransform.transformKeys(input, CasingTransform.snakeToCamel) as? [String: Any]
        )

        let outer = try #require(result["outerKey"] as? [String: Any])
        #expect(outer["innerKey"] as? String == "value")
        let list = try #require(outer["nestedList"] as? [[String: Any]])
        #expect(list[0]["itemId"] as? String == "1")
        #expect(list[1]["itemId"] as? String == "2")
    }

    @Test func transformKeysPassesThroughPrimitives() {
        #expect(CasingTransform.transformKeys("text", CasingTransform.snakeToCamel) as? String == "text")
        #expect(CasingTransform.transformKeys(42, CasingTransform.snakeToCamel) as? Int == 42)
        #expect(CasingTransform.transformKeys(true, CasingTransform.snakeToCamel) as? Bool == true)
        #expect(CasingTransform.transformKeys(NSNull(), CasingTransform.snakeToCamel) is NSNull)
    }

    @Test func encodeForJSConvertsTopLevelKeysToCamelCase() throws {
        let payload = makePayload()
        let json = try CasingTransform.encodeForJS(payload)

        let parsed = try #require(JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any])

        #expect(parsed["continueUrl"] != nil)
        #expect(parsed["continue_url"] == nil)
        #expect(parsed["lineItems"] != nil)
        #expect(parsed["line_items"] == nil)
        #expect(parsed["expiresAt"] != nil)
        #expect(parsed["expires_at"] == nil)
    }

    @Test func encodeForJSConvertsNestedKeysToCamelCase() throws {
        let payload = makePayload()
        let json = try CasingTransform.encodeForJS(payload)

        let parsed = try #require(JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any])
        let ucp = try #require(parsed["ucp"] as? [String: Any])
        #expect(ucp["paymentHandlers"] != nil)
        #expect(ucp["payment_handlers"] == nil)
    }

    @Test func decodeFromJSAcceptsCamelCaseInputAndDecodesIntoTypedModel() throws {
        let camelJSON = #"""
        {
          "id": "chk_1",
          "currency": "USD",
          "continueUrl": "https://example.com/continue",
          "expiresAt": "2023-11-14T22:13:20Z",
          "lineItems": [],
          "ucp": {
            "version": "2026-04-08",
            "paymentHandlers": {}
          }
        }
        """#

        let payload = try CasingTransform.decodeFromJS(camelJSON, as: TestPayload.self)

        #expect(payload.id == "chk_1")
        #expect(payload.currency == "USD")
        #expect(payload.continueURL == "https://example.com/continue")
        #expect(payload.lineItems.isEmpty)
        #expect(payload.ucp.version == "2026-04-08")
        #expect(payload.ucp.paymentHandlers.isEmpty)
    }

    private func makePayload() -> TestPayload {
        TestPayload(
            id: "chk_1",
            currency: "USD",
            continueURL: "https://example.com/continue",
            expiresAt: Date(timeIntervalSince1970: 1_700_000_000),
            lineItems: [],
            ucp: TestUCP(version: "2026-04-08", paymentHandlers: [:])
        )
    }
}

private struct TestPayload: Codable {
    let id: String
    let currency: String
    let continueURL: String
    let expiresAt: Date
    let lineItems: [TestLineItem]
    let ucp: TestUCP

    enum CodingKeys: String, CodingKey {
        case id
        case currency
        case continueURL = "continue_url"
        case expiresAt = "expires_at"
        case lineItems = "line_items"
        case ucp
    }
}

private struct TestLineItem: Codable {
    let id: String
    let imageURL: String

    enum CodingKeys: String, CodingKey {
        case id
        case imageURL = "image_url"
    }
}

private struct TestUCP: Codable {
    let version: String
    let paymentHandlers: [String: String]

    enum CodingKeys: String, CodingKey {
        case version
        case paymentHandlers = "payment_handlers"
    }
}
