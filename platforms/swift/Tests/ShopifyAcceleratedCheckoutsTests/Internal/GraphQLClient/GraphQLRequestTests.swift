@testable import ShopifyAcceleratedCheckouts
import XCTest

@available(iOS 17.0, *)
final class GraphQLRequestTests: XCTestCase {
    // MARK: - Test Response Types

    struct TestResponse: Codable {
        let success: Bool
    }

    // MARK: - Initialization Tests

    func testInitWithDocumentString() {
        let query = "query { test }"

        let operation = GraphQLRequest(
            query: query,
            responseType: TestResponse.self
        )

        XCTAssertEqual(operation.query, query)
        XCTAssertTrue(operation.responseType == TestResponse.self)
    }

    func testInitWithQueryEnum() {
        let queryEnum = GraphQLDocument.Queries.cart

        let operation = GraphQLRequest(
            operation: queryEnum,
            responseType: StorefrontAPI.CartQueryResponse.self
        )

        XCTAssertFalse(operation.query.isEmpty)
        XCTAssertTrue(operation.responseType == StorefrontAPI.CartQueryResponse.self)
        // Verify it contains the expected query structure
        XCTAssertTrue(operation.query.contains("query GetCart("))
        XCTAssertTrue(operation.query.contains("cart("))
    }

    func testInitWithMutationEnum() {
        let mutation = GraphQLDocument.Mutations.cartCreate

        let operation = GraphQLRequest(
            operation: mutation,
            responseType: StorefrontAPI.CartCreateResponse.self
        )

        XCTAssertFalse(operation.query.isEmpty)
        XCTAssertTrue(operation.responseType == StorefrontAPI.CartCreateResponse.self)
        // Verify it contains the expected mutation structure
        XCTAssertTrue(operation.query.contains("mutation CartCreate("))
        XCTAssertTrue(operation.query.contains("cartCreate("))
    }

    // MARK: - Pre-defined Operations Tests

    func testCartCreateOperation() {
        let operation = Operations.cartCreate()

        XCTAssertTrue(operation.responseType == StorefrontAPI.CartCreateResponse.self)
        XCTAssertTrue(operation.query.contains("mutation CartCreate("))
        XCTAssertTrue(operation.query.contains("cartCreate("))
    }

    func testCartBuyerIdentityUpdateOperation() {
        let operation = Operations.cartBuyerIdentityUpdate()

        XCTAssertTrue(operation.responseType == StorefrontAPI.CartBuyerIdentityUpdateResponse.self)
        XCTAssertTrue(operation.query.contains("mutation CartBuyerIdentityUpdate("))
        XCTAssertTrue(operation.query.contains("cartBuyerIdentityUpdate("))
    }

    func testCartDeliveryAddressesReplaceOperation() {
        let operation = Operations.cartDeliveryAddressesReplace()

        XCTAssertTrue(operation.responseType == StorefrontAPI.CartDeliveryAddressesReplaceResponse.self)
        XCTAssertTrue(operation.query.contains("mutation CartDeliveryAddressesReplace("))
        XCTAssertTrue(operation.query.contains("cartDeliveryAddressesReplace("))
    }

    func testCartSelectedDeliveryOptionsUpdateOperation() {
        let operation = Operations.cartSelectedDeliveryOptionsUpdate()

        XCTAssertTrue(operation.responseType == StorefrontAPI.CartSelectedDeliveryOptionsUpdateResponse.self)
        XCTAssertTrue(operation.query.contains("mutation CartSelectedDeliveryOptionsUpdate("))
        XCTAssertTrue(operation.query.contains("cartSelectedDeliveryOptionsUpdate("))
    }

    func testCartPaymentUpdateOperation() {
        let operation = Operations.cartPaymentUpdate()

        XCTAssertTrue(operation.responseType == StorefrontAPI.CartPaymentUpdateResponse.self)
        XCTAssertTrue(operation.query.contains("mutation CartPaymentUpdate("))
        XCTAssertTrue(operation.query.contains("cartPaymentUpdate("))
    }

    func testCartRemovePersonalDataOperation() {
        let operation = Operations.cartRemovePersonalData()

        XCTAssertTrue(operation.responseType == StorefrontAPI.CartRemovePersonalDataResponse.self)
        XCTAssertTrue(operation.query.contains("mutation CartRemovePersonalData("))
        XCTAssertTrue(operation.query.contains("cartRemovePersonalData("))
    }

    func testCartPrepareForCompletionOperation() {
        let operation = Operations.cartPrepareForCompletion()

        XCTAssertTrue(operation.responseType == StorefrontAPI.CartPrepareForCompletionResponse.self)
        XCTAssertTrue(operation.query.contains("mutation CartPrepareForCompletion("))
        XCTAssertTrue(operation.query.contains("cartPrepareForCompletion("))
    }

    func testCartSubmitForCompletionOperation() {
        let operation = Operations.cartSubmitForCompletion()

        XCTAssertTrue(operation.responseType == StorefrontAPI.CartSubmitForCompletionResponse.self)
        XCTAssertTrue(operation.query.contains("mutation CartSubmitForCompletion("))
        XCTAssertTrue(operation.query.contains("cartSubmitForCompletion("))
    }

    func testGetCartOperation() {
        let operation = Operations.getCart()

        XCTAssertTrue(operation.responseType == StorefrontAPI.CartQueryResponse.self)
        XCTAssertTrue(operation.query.contains("query GetCart("))
        XCTAssertTrue(operation.query.contains("cart("))
    }

    // MARK: - Type Safety Tests

    func testOperationTypeInference() {
        // This test verifies that the type system correctly infers types
        // When using pre-defined operations
        let cartCreateOp = Operations.cartCreate()
        let cartQueryOp = Operations.getCart()

        // These should be different types
        XCTAssertFalse(type(of: cartCreateOp) == type(of: cartQueryOp))
    }

    func testOperationDocumentConsistency() {
        // Test that operations consistently build their queries
        let operation1 = GraphQLRequest(
            operation: .cartCreate,
            responseType: StorefrontAPI.CartCreateResponse.self
        )
        let operation2 = Operations.cartCreate()

        // Both should produce the same query
        XCTAssertEqual(operation1.query, operation2.query)
    }

    // MARK: - Variables Tests

    func testOperationsWithVariables() {
        // Test that operations can accept variables
        let variables: [String: Any] = ["cartId": "test123", "input": ["name": "test"]]

        let cartOperation = Operations.getCart(variables: variables)
        XCTAssertEqual(cartOperation.variables["cartId"] as? String, "test123")

        let createOperation = Operations.cartCreate(variables: variables)
        let inputDict = createOperation.variables["input"] as? [String: Any]
        XCTAssertEqual(inputDict?["name"] as? String, "test")
    }

    func testOperationsWithEmptyVariables() {
        // Test that operations work with empty variables
        let operation = Operations.cartCreate()
        XCTAssertTrue(operation.variables.isEmpty)
    }

    // MARK: - Directive Tests

    func testWithContextDirective() {
        let operation = GraphQLRequest(
            query: "query GetCart { cart(id: $id) { id } }",
            responseType: StorefrontAPI.CartQueryResponse.self
        )
        let context = InContextDirective(countryCode: CountryCode.CA, languageCode: LanguageCode.FR)

        let operationWithDirective = operation.withContextDirective(context)

        XCTAssertTrue(operationWithDirective.query.contains("@inContext(country: CA, language: FR)"))
        XCTAssertTrue(operationWithDirective.query.contains("query GetCart"))
    }

    func testMinifyQuery() {
        let operation = GraphQLRequest(
            query: """
            query GetCart {
                cart(id: $id) {
                    id
                    # This is a comment
                    lines {
                        id
                    }
                }
            }
            """,
            responseType: StorefrontAPI.CartQueryResponse.self
        )

        let minifiedOperation = operation.minify()

        XCTAssertFalse(minifiedOperation.query.contains("\n"))
        XCTAssertFalse(minifiedOperation.query.contains("# This is a comment"))
        XCTAssertTrue(minifiedOperation.query.contains("query GetCart"))
        XCTAssertTrue(minifiedOperation.query.contains("cart(id: $id)"))
    }
}
