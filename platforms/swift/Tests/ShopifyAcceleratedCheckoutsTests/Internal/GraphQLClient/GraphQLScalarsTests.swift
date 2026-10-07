@testable import ShopifyAcceleratedCheckouts
import XCTest

final class GraphQLScalarsTests: XCTestCase {
    // MARK: - ID Scalar Tests

    func testIDInitialization() {
        // Test direct initialization
        let id = GraphQLScalars.ID("gid://shopify/Product/123")
        XCTAssertEqual(id.rawValue, "gid://shopify/Product/123")
        XCTAssertEqual(id.description, "gid://shopify/Product/123")
    }

    func testIDCodable() throws {
        // Test encoding
        let id = GraphQLScalars.ID("gid://shopify/Cart/456")
        let encoded = try JSONEncoder().encode(id)
        let encodedString = String(data: encoded, encoding: .utf8)
        // JSON encoder may escape forward slashes, both are valid
        XCTAssertTrue(encodedString == "\"gid://shopify/Cart/456\"" || encodedString == "\"gid:\\/\\/shopify\\/Cart\\/456\"")

        // Test decoding
        let json = "\"gid://shopify/Order/789\""
        let data = try XCTUnwrap(json.data(using: .utf8))
        let decoded = try JSONDecoder().decode(GraphQLScalars.ID.self, from: data)
        XCTAssertEqual(decoded.rawValue, "gid://shopify/Order/789")
    }

    func testIDHashable() {
        let id1 = GraphQLScalars.ID("gid://shopify/Product/123")
        let id2 = GraphQLScalars.ID("gid://shopify/Product/123")
        let id3 = GraphQLScalars.ID("gid://shopify/Product/456")

        XCTAssertEqual(id1, id2)
        XCTAssertNotEqual(id1, id3)

        // Test in Set
        let set: Set<GraphQLScalars.ID> = [id1, id2, id3]
        XCTAssertEqual(set.count, 2)
    }

    // MARK: - DateTime Scalar Tests

    func testDateTimeInitialization() {
        let date = Date()
        let dateTime = GraphQLScalars.DateTime(date)
        XCTAssertEqual(dateTime.date, date)
    }

    func testDateTimeEncodingDecoding() throws {
        // Test with fractional seconds
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let dateString = "2025-06-25T12:30:45.123Z"
        let date = try XCTUnwrap(formatter.date(from: dateString))

        let dateTime = GraphQLScalars.DateTime(date)
        let encoded = try JSONEncoder().encode(dateTime)
        let encodedString = try XCTUnwrap(String(data: encoded, encoding: .utf8))

        // The encoded string should be a valid ISO8601 date
        XCTAssertTrue(encodedString.contains("2025-06-25"))

        // Test decoding with fractional seconds
        let jsonWithFractional = "\"2025-06-25T12:30:45.123Z\""
        let dataWithFractional = try XCTUnwrap(jsonWithFractional.data(using: .utf8))
        let decodedWithFractional = try JSONDecoder().decode(GraphQLScalars.DateTime.self, from: dataWithFractional)
        XCTAssertNotNil(decodedWithFractional.date)

        // Test decoding without fractional seconds
        let jsonWithoutFractional = "\"2025-06-25T12:30:45Z\""
        let dataWithoutFractional = try XCTUnwrap(jsonWithoutFractional.data(using: .utf8))
        let decodedWithoutFractional = try JSONDecoder().decode(GraphQLScalars.DateTime.self, from: dataWithoutFractional)
        XCTAssertNotNil(decodedWithoutFractional.date)
    }

    func testDateTimeInvalidFormat() throws {
        let invalidJson = "\"not-a-date\""
        let data = try XCTUnwrap(invalidJson.data(using: .utf8))

        XCTAssertThrowsError(try JSONDecoder().decode(GraphQLScalars.DateTime.self, from: data)) { error in
            XCTAssertTrue(error is DecodingError)
        }
    }

    func testDateTimeHashable() {
        let date1 = Date()
        let date2 = Date(timeIntervalSince1970: 0)

        let dateTime1 = GraphQLScalars.DateTime(date1)
        let dateTime2 = GraphQLScalars.DateTime(date1)
        let dateTime3 = GraphQLScalars.DateTime(date2)

        XCTAssertEqual(dateTime1, dateTime2)
        XCTAssertNotEqual(dateTime1, dateTime3)
    }

    // MARK: - URL Scalar Tests

    func testURLInitialization() throws {
        // Test with Foundation.URL
        let foundationURL = try XCTUnwrap(Foundation.URL(string: "https://example.com"))
        let url1 = GraphQLScalars.URL(foundationURL)
        XCTAssertEqual(url1.url, foundationURL)

        // Test with string
        let url2 = GraphQLScalars.URL(string: "https://shopify.com")
        XCTAssertNotNil(url2)
        XCTAssertEqual(url2?.url.absoluteString, "https://shopify.com")

        // Test with invalid string - Foundation.URL actually accepts this
        let url3 = GraphQLScalars.URL(string: "not a url")
        XCTAssertNotNil(url3) // Foundation.URL accepts this as a relative URL
    }

    func testURLCodable() throws {
        // Test encoding
        let url = try GraphQLScalars.URL(XCTUnwrap(Foundation.URL(string: "https://example.com/path")))
        let encoded = try JSONEncoder().encode(url)
        let encodedString = String(data: encoded, encoding: .utf8)
        // JSON encoder may escape forward slashes
        XCTAssertTrue(encodedString == "\"https://example.com/path\"" || encodedString == "\"https:\\/\\/example.com\\/path\"")

        // Test decoding valid URL
        let json = "\"https://shopify.com/products\""
        let data = try XCTUnwrap(json.data(using: .utf8))
        let decoded = try JSONDecoder().decode(GraphQLScalars.URL.self, from: data)
        XCTAssertEqual(decoded.url.absoluteString, "https://shopify.com/products")

        // Test decoding invalid URL - use actually invalid URL
        let invalidJson = "\"\"" // Empty string is invalid URL
        let invalidData = try XCTUnwrap(invalidJson.data(using: .utf8))
        XCTAssertThrowsError(try JSONDecoder().decode(GraphQLScalars.URL.self, from: invalidData))
    }

    func testURLHashable() throws {
        let url1 = try GraphQLScalars.URL(XCTUnwrap(Foundation.URL(string: "https://example.com")))
        let url2 = try GraphQLScalars.URL(XCTUnwrap(Foundation.URL(string: "https://example.com")))
        let url3 = try GraphQLScalars.URL(XCTUnwrap(Foundation.URL(string: "https://different.com")))

        XCTAssertEqual(url1, url2)
        XCTAssertNotEqual(url1, url3)
    }

    // MARK: - CountryCode Enum Tests

    func testCountryCodeCodable() throws {
        // Test encoding
        let country = CountryCode.US
        let encoded = try JSONEncoder().encode(country)
        let encodedString = String(data: encoded, encoding: .utf8)
        XCTAssertEqual(encodedString, "\"US\"")

        // Test decoding
        let json = "\"CA\""
        let data = try XCTUnwrap(json.data(using: .utf8))
        let decoded = try JSONDecoder().decode(CountryCode.self, from: data)
        XCTAssertEqual(decoded, .CA)
    }

    func testCountryCodeAllCases() {
        // Test that we have many country codes
        XCTAssertGreaterThan(CountryCode.allCases.count, 200)

        // Test some specific cases
        XCTAssertTrue(CountryCode.allCases.contains(.US))
        XCTAssertTrue(CountryCode.allCases.contains(.CA))
        XCTAssertTrue(CountryCode.allCases.contains(.GB))
        XCTAssertTrue(CountryCode.allCases.contains(.AU))
        XCTAssertTrue(CountryCode.allCases.contains(.JP))
    }

    func testCountryCodeSpecialCases() {
        // Test reserved keywords with backticks
        XCTAssertEqual(CountryCode.DO.rawValue, "DO")
        XCTAssertEqual(CountryCode.IN.rawValue, "IN")
        XCTAssertEqual(CountryCode.IS.rawValue, "IS")
    }

    // MARK: - Integration Tests

    func testScalarsInComplexStructure() throws {
        // Test that scalars work correctly in a complex structure
        struct TestProduct: Codable {
            let id: GraphQLScalars.ID
            let createdAt: GraphQLScalars.DateTime
            let productUrl: GraphQLScalars.URL
            let countryCode: CountryCode
        }

        let product = try TestProduct(
            id: GraphQLScalars.ID("gid://shopify/Product/123"),
            createdAt: GraphQLScalars.DateTime(Date()),
            productUrl: GraphQLScalars.URL(XCTUnwrap(Foundation.URL(string: "https://shop.com/product"))),
            countryCode: .US
        )

        // Test round-trip encoding/decoding
        let encoded = try JSONEncoder().encode(product)
        let decoded = try JSONDecoder().decode(TestProduct.self, from: encoded)

        XCTAssertEqual(decoded.id, product.id)
        XCTAssertEqual(decoded.productUrl, product.productUrl)
        XCTAssertEqual(decoded.countryCode, product.countryCode)
    }
}
