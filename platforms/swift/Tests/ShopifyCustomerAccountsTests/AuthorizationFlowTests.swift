@testable import CustomerAccountsOAuth
import XCTest

final class AuthorizationFlowTests: XCTestCase {
    func testAuthorizationRequestIncludesPKCEStateAndNonce() throws {
        let context = try AuthorizationFlow(configuration: makeOAuthConfiguration()).makeAuthorizationContext()
        let components = try XCTUnwrap(URLComponents(url: context.url, resolvingAgainstBaseURL: false))
        let parameters = Dictionary(uniqueKeysWithValues: (components.queryItems ?? []).compactMap { item in
            item.value.map { (item.name, $0) }
        })

        XCTAssertEqual(context.url.path, "/authentication/123456789/oauth/authorize")
        XCTAssertEqual(parameters["client_id"], "test-client")
        XCTAssertEqual(parameters["redirect_uri"], "shop.123456789.app://callback")
        XCTAssertEqual(parameters["response_type"], "code")
        XCTAssertEqual(parameters["code_challenge_method"], "S256")
        XCTAssertEqual(parameters["state"], context.state)
        XCTAssertEqual(parameters["nonce"], context.nonce)
        XCTAssertFalse(context.codeVerifier.isEmpty)
        XCTAssertFalse(try XCTUnwrap(parameters["code_challenge"]).isEmpty)
    }

    func testValidCallbackReturnsAuthorizationCode() throws {
        let flow = AuthorizationFlow(configuration: makeOAuthConfiguration())
        let callback = try XCTUnwrap(
            URL(string: "shop.123456789.app://callback?code=authorization-code&state=expected-state")
        )

        XCTAssertEqual(
            try flow.authorizationCode(from: callback, expectedState: "expected-state"),
            "authorization-code"
        )
    }

    func testCallbackRejectsWrongState() throws {
        let flow = AuthorizationFlow(configuration: makeOAuthConfiguration())
        let callback = try XCTUnwrap(
            URL(string: "shop.123456789.app://callback?code=authorization-code&state=wrong-state")
        )

        XCTAssertThrowsError(try flow.authorizationCode(from: callback, expectedState: "expected-state")) {
            XCTAssertEqual($0 as? OAuthError, .invalidState)
        }
    }

    func testCallbackRejectsWrongRedirectHost() throws {
        let flow = AuthorizationFlow(configuration: makeOAuthConfiguration())
        let callback = try XCTUnwrap(
            URL(string: "shop.123456789.app://attacker?code=authorization-code&state=expected-state")
        )

        XCTAssertThrowsError(try flow.authorizationCode(from: callback, expectedState: "expected-state")) {
            XCTAssertEqual($0 as? OAuthError, .invalidCallback)
        }
    }

    func testCallbackRejectsDuplicateParameters() throws {
        let flow = AuthorizationFlow(configuration: makeOAuthConfiguration())
        let callback = try XCTUnwrap(URL(
            string: "shop.123456789.app://callback?code=one&code=two&state=expected-state"
        ))

        XCTAssertThrowsError(try flow.authorizationCode(from: callback, expectedState: "expected-state")) {
            XCTAssertEqual($0 as? OAuthError, .invalidCallback)
        }
    }
}
