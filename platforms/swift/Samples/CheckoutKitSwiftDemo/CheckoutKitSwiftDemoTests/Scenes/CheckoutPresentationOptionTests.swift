@testable import CheckoutKitSwiftDemo
import XCTest

@MainActor
class CheckoutPresentationOptionTests: XCTestCase {
    private var originalSelection: Any?

    override func setUp() async throws {
        try await super.setUp()
        originalSelection = UserDefaults.standard.object(forKey: AppStorageKeys.checkoutPresentation.rawValue)
        UserDefaults.standard.removeObject(forKey: AppStorageKeys.checkoutPresentation.rawValue)
    }

    override func tearDown() async throws {
        UserDefaults.standard.set(originalSelection, forKey: AppStorageKeys.checkoutPresentation.rawValue)
        try await super.tearDown()
    }

    func testDefaultsToSwiftUIPresentation() {
        XCTAssertEqual(SettingsView().checkoutPresentationOption, .swiftUI)
        XCTAssertEqual(CartView().checkoutPresentationOption, .swiftUI)
    }

    func testSettingsPersistsThePresentationForSettingsAndCart() {
        let settings = SettingsView()

        for option in CheckoutPresentationOption.allCases {
            settings.checkoutPresentationOption = option

            XCTAssertEqual(UserDefaults.standard.string(forKey: AppStorageKeys.checkoutPresentation.rawValue), option.rawValue)
            XCTAssertEqual(SettingsView().checkoutPresentationOption, option)
            XCTAssertEqual(CartView().checkoutPresentationOption, option)
        }
    }

    func testUnknownStoredPresentationFallsBackToSwiftUI() {
        UserDefaults.standard.set("unknown", forKey: AppStorageKeys.checkoutPresentation.rawValue)

        XCTAssertEqual(SettingsView().checkoutPresentationOption, .swiftUI)
        XCTAssertEqual(CartView().checkoutPresentationOption, .swiftUI)
    }
}
