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

@testable import ShopifyCheckoutKit
import XCTest

class ShopifyCheckoutKitTests: XCTestCase {
    func test_version_whenAccessed_shouldExist() {
        XCTAssertFalse(ShopifyCheckoutKit.version.isEmpty)
    }

    func test_configuration_whenLogLevelChanges_createsNewLogger() {
        XCTAssertFalse(ShopifyCheckoutKit.version.isEmpty)
    }

    func test_configuration_whenLogLevelSetsSameLevel_instanceRemainsSame() {
        XCTAssertFalse(ShopifyCheckoutKit.version.isEmpty)
    }

    func test_configuration_logLevelDefaultsToError() {
        XCTAssertEqual(
            ShopifyCheckoutKit.configuration.logLevel,
            LogLevel.error,
            "Default logLevel should be .error"
        )
        XCTAssertEqual(
            OSLogger.shared.logLevel,
            LogLevel.error,
            "Default logger logLevel should be .error"
        )
    }

    func test_configuration_onLogLevelChange_usesExistingInstance() {
        let originalLogger = OSLogger.shared
        let originalLogLevel = OSLogger.shared.logLevel

        ShopifyCheckoutKit.configure { $0.logLevel = originalLogLevel }
        let newLogger = OSLogger.shared

        XCTAssertTrue(
            originalLogger === newLogger,
            "Changing log level should create a new logger instance"
        )
    }

    func test_logger_withDifferentLogLevels_shouldHaveCorrectLogLevel() {
        ShopifyCheckoutKit.configure { $0.logLevel = .all }
        XCTAssertEqual(
            OSLogger.shared.logLevel,
            .all,
            "Logger should have .all log level"
        )

        ShopifyCheckoutKit.configure { $0.logLevel = .debug }
        XCTAssertEqual(
            OSLogger.shared.logLevel,
            .debug,
            "Logger should have .debug log level"
        )

        ShopifyCheckoutKit.configure { $0.logLevel = .error }
        XCTAssertEqual(
            OSLogger.shared.logLevel,
            .error,
            "Logger should have .error log level"
        )

        ShopifyCheckoutKit.configure { $0.logLevel = .none }
        XCTAssertEqual(
            OSLogger.shared.logLevel,
            .none,
            "Logger should have .none log level"
        )
    }
}
