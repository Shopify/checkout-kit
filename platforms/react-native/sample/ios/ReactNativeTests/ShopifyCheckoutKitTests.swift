import Foundation
@testable import RNShopifyCheckoutKit
import ShopifyCheckoutKit
import XCTest

class ShopifyCheckoutKitTests: XCTestCase {
    private var shopifyCheckoutKit: RCTShopifyCheckoutKit!

    override func setUp() {
        super.setUp()
        shopifyCheckoutKit = getShopifyCheckoutKit()
        resetShopifyCheckoutKitDefaults()
    }

    override func tearDown() {
        shopifyCheckoutKit = nil
        super.tearDown()
    }

    private func resetShopifyCheckoutKitDefaults() {
        ShopifyCheckoutKit.configuration.colorScheme = .automatic
        ShopifyCheckoutKit.configuration.closeButtonTintColor = nil
        ShopifyCheckoutKit.configuration.logLevel = LogLevel.error
    }

    private func getShopifyCheckoutKit() -> RCTShopifyCheckoutKit {
        return RCTShopifyCheckoutKit()
    }

    /// getConfig
    func testReturnsDefaultConfig() {
        // Call getConfig and capture the result
        let result = shopifyCheckoutKit.getConfig() as? [String: Any]

        // Verify that getConfig returned the expected result
        XCTAssertEqual(result?["colorScheme"] as? String, "automatic")
    }

    /// configure
    func testConfigure() {
        let configuration: [AnyHashable: Any] = [
            "colorScheme": "dark",
            "colors": [
                "ios": [
                    "tintColor": "#FF0000",
                    "backgroundColor": "#0000FF"
                ]
            ]
        ]

        shopifyCheckoutKit.setConfig(configuration)

        XCTAssertEqual(ShopifyCheckoutKit.configuration.colorScheme, .dark)
        XCTAssertEqual(ShopifyCheckoutKit.configuration.tintColor, UIColor(hex: "#FF0000"))
        XCTAssertEqual(ShopifyCheckoutKit.configuration.backgroundColor, UIColor(hex: "#0000FF"))
    }

    func testConfigureWithInvalidColors() {
        let configuration: [AnyHashable: Any] = [
            "colors": [
                "ios": [
                    "tintColor": "invalid"
                ]
            ]
        ]

        let defaultColorFallback = UIColor(red: 0, green: 0, blue: 0, alpha: 1)
        shopifyCheckoutKit.setConfig(configuration)

        XCTAssertEqual(ShopifyCheckoutKit.configuration.tintColor, defaultColorFallback)
    }

  func testConfigureWithCloseButtonColor() {
    let configuration: [AnyHashable: Any] = [
      "colors": [
        "ios": [
          "closeButtonColor": "#FF0000"
        ]
      ]
    ]

    shopifyCheckoutKit.setConfig(configuration)

    XCTAssertEqual(ShopifyCheckoutKit.configuration.closeButtonTintColor, UIColor(hex: "#FF0000"))
  }

  func testConfigureWithInvalidCloseButtonColor() {
    let configuration: [AnyHashable: Any] = [
      "colors": [
        "ios": [
          "closeButtonColor": "invalid"
        ]
      ]
    ]

    let defaultColorFallback = UIColor(red: 0, green: 0, blue: 0, alpha: 1)
    shopifyCheckoutKit.setConfig(configuration)

    XCTAssertEqual(ShopifyCheckoutKit.configuration.closeButtonTintColor, defaultColorFallback)
  }

  func testConfigureWithoutCloseButtonColor() {
    let configuration: [AnyHashable: Any] = [
      "colors": [
        "ios": [
          "tintColor": "#FF0000"
        ]
      ]
    ]

    shopifyCheckoutKit.setConfig(configuration)

    // closeButtonTintColor should remain nil when not specified (uses system default)
    XCTAssertNil(ShopifyCheckoutKit.configuration.closeButtonTintColor)
  }

  func testGetConfigIncludesCloseButtonColor() {
    // Set a close button color
    let configuration: [AnyHashable: Any] = [
      "colors": [
        "ios": [
          "closeButtonColor": "#00FF00"
        ]
      ]
    ]
    shopifyCheckoutKit.setConfig(configuration)

    // Call getConfig and capture the result
    var result: [String: Any]?
    result = shopifyCheckoutKit.getConfig() as? [String: Any]

    // Verify that getConfig returned the close button color
    XCTAssertNotNil(result?["closeButtonColor"])
    let returnedColor = result?["closeButtonColor"] as? UIColor
    XCTAssertEqual(returnedColor, UIColor(hex: "#00FF00"))
  }

  func testConfigureWithLogLevelDebug() {
    let configuration: [AnyHashable: Any] = [
      "logLevel": "debug"
    ]

    shopifyCheckoutKit.setConfig(configuration)

    XCTAssertEqual(ShopifyCheckoutKit.configuration.logLevel, LogLevel.debug)
  }

  func testConfigureWithLogLevelError() {
    let configuration: [AnyHashable: Any] = [
      "logLevel": "error"
    ]

    shopifyCheckoutKit.setConfig(configuration)

    XCTAssertEqual(ShopifyCheckoutKit.configuration.logLevel, LogLevel.error)
  }

  func testConfigureWithLogLevelNone() {
    let configuration: [AnyHashable: Any] = [
      "logLevel": "none"
    ]

    shopifyCheckoutKit.setConfig(configuration)

    XCTAssertEqual(ShopifyCheckoutKit.configuration.logLevel, LogLevel.none)
  }

  func testConfigureWithInvalidLogLevelDefaultsToError() {
    let configuration: [AnyHashable: Any] = [
      "logLevel": "invalid"
    ]

    shopifyCheckoutKit.setConfig(configuration)

    XCTAssertEqual(ShopifyCheckoutKit.configuration.logLevel, LogLevel.error)
  }

  func testLogLevelHandlesUppercaseDebug() {
    let configuration: [AnyHashable: Any] = [
      "logLevel": "DEBUG"
    ]

    shopifyCheckoutKit.setConfig(configuration)

    XCTAssertEqual(ShopifyCheckoutKit.configuration.logLevel, LogLevel.debug)
  }

  func testLogLevelHandlesMixedCaseDebug() {
    let configuration: [AnyHashable: Any] = [
      "logLevel": "Debug"
    ]

    shopifyCheckoutKit.setConfig(configuration)

    XCTAssertEqual(ShopifyCheckoutKit.configuration.logLevel, LogLevel.debug)
  }

  func testLogLevelHandlesUppercaseError() {
    let configuration: [AnyHashable: Any] = [
      "logLevel": "ERROR"
    ]

    shopifyCheckoutKit.setConfig(configuration)

    XCTAssertEqual(ShopifyCheckoutKit.configuration.logLevel, LogLevel.error)
  }

  func testSetConfigWithoutLogLevelDefaultsToError() {
    let configuration: [AnyHashable: Any] = [:]

    shopifyCheckoutKit.setConfig(configuration)

    XCTAssertEqual(ShopifyCheckoutKit.configuration.logLevel, LogLevel.error)
  }

  func testGetConfigIncludesLogLevel() {
    let configuration: [AnyHashable: Any] = [
      "logLevel": "debug"
    ]
    shopifyCheckoutKit.setConfig(configuration)

    var result: [String: Any]?
    result = shopifyCheckoutKit.getConfig() as? [String: Any]

    XCTAssertEqual(result?["logLevel"] as? String, "debug")
  }

  func testGetConfigReturnsDefaultLogLevel() {
    var result: [String: Any]?
    result = shopifyCheckoutKit.getConfig() as? [String: Any]

    XCTAssertEqual(result?["logLevel"] as? String, "error")
  }

  func testGetConfigReturnsDebugForDebugLogLevel() {
    let configuration: [AnyHashable: Any] = [
      "logLevel": "debug"
    ]
    shopifyCheckoutKit.setConfig(configuration)

    var result: [String: Any]?
    result = shopifyCheckoutKit.getConfig() as? [String: Any]

    XCTAssertEqual(result?["logLevel"] as? String, "debug")
  }

  func testGetConfigReturnsErrorForErrorLogLevel() {
    let configuration: [AnyHashable: Any] = [
      "logLevel": "error"
    ]
    shopifyCheckoutKit.setConfig(configuration)

    var result: [String: Any]?
    result = shopifyCheckoutKit.getConfig() as? [String: Any]

    XCTAssertEqual(result?["logLevel"] as? String, "error")
  }

  func testGetConfigReturnsErrorForNoneLogLevel() {
    let configuration: [AnyHashable: Any] = [
      "logLevel": "none"
    ]
    shopifyCheckoutKit.setConfig(configuration)

    var result: [String: Any]?
    result = shopifyCheckoutKit.getConfig() as? [String: Any]

    XCTAssertEqual(result?["logLevel"] as? String, "error")
  }

  func testGetConfigReturnsErrorForInvalidLogLevel() {
    let configuration: [AnyHashable: Any] = [
      "logLevel": "invalid"
    ]
    shopifyCheckoutKit.setConfig(configuration)

    var result: [String: Any]?
    result = shopifyCheckoutKit.getConfig() as? [String: Any]

    XCTAssertEqual(result?["logLevel"] as? String, "error")
  }

  func testFailedPresentReleasesPendingDispatchCallback() {
    let presentAttemptCompleted = expectation(description: "present attempt completed")
    var dispatchCount = 0

    shopifyCheckoutKit.present("", dispatch: { _ in
      dispatchCount += 1
    })

    DispatchQueue.main.async {
      self.shopifyCheckoutKit.checkoutDidCancel()
      XCTAssertEqual(dispatchCount, 0)
      presentAttemptCompleted.fulfill()
    }

    wait(for: [presentAttemptCompleted], timeout: 1)
  }

    // TODO: re-enable terminal-event tests (checkoutDidComplete, checkoutDidCancel, checkoutDidFail)
    // once the iOS CheckoutDelegate lands upstream — parallels Android's
    // DefaultCheckoutListener.onCheckoutCanceled / onCheckoutFailed.
}
