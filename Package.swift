// swift-tools-version: 6.0
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "ShopifyCheckoutKit",
    platforms: [
        .iOS(.v15)
    ],
    products: [
        // Products define the executables and libraries a package produces, and make them visible to other packages.
        .library(
            name: "ShopifyCheckoutKit",
            targets: ["ShopifyCheckoutKit"]
        ),
        .library(
            name: "ShopifyAcceleratedCheckouts",
            targets: ["ShopifyAcceleratedCheckouts"]
        ),
        .library(
            name: "EmbeddedCheckoutProtocol",
            targets: ["EmbeddedCheckoutProtocol"]
        ),
    ],
    dependencies: [
        // Dependencies declare other packages that this package depends on.
        // .package(url: /* package url */, from: "1.0.0"),
        .package(url: "https://github.com/nalexn/ViewInspector", from: "0.10.0")
    ],
    targets: [
        // Targets are the basic building blocks of a package. A target can define a module or a test suite.
        // Targets can depend on other targets in this package, and on products in packages this package depends on.
        .target(
            name: "EmbeddedCheckoutProtocol",
            path: "protocols/universal-commerce-protocol/embedded-checkout-protocol/languages/swift/Sources/UniversalCommerceProtocol/EmbeddedCheckoutProtocol"
        ),
        .target(
            name: "CheckoutKitTelemetry",
            dependencies: ["EmbeddedCheckoutProtocol"],
            path: "platforms/swift/Sources/Internal/Telemetry"
        ),
        .target(
            name: "ShopifyCheckoutKit",
            dependencies: ["EmbeddedCheckoutProtocol", "CheckoutKitTelemetry"],
            path: "platforms/swift/Sources/ShopifyCheckout",
            resources: [.process("Assets.xcassets")]
        ),
        .target(
            name: "ShopifyAcceleratedCheckouts",
            dependencies: ["ShopifyCheckoutKit"],
            path: "platforms/swift/Sources/ShopifyAcceleratedCheckouts",
            resources: [.process("Localizable.xcstrings"), .process("Media.xcassets")]
        ),
        .testTarget(
            name: "EmbeddedCheckoutProtocolTests",
            dependencies: ["EmbeddedCheckoutProtocol"],
            path: "protocols/universal-commerce-protocol/embedded-checkout-protocol/languages/swift/Tests/EmbeddedCheckoutProtocolTests",
            resources: [.copy("Fixtures")]
        ),
        .testTarget(
            name: "CheckoutKitTelemetryTests",
            dependencies: ["CheckoutKitTelemetry"],
            path: "platforms/swift/Tests/Internal/CheckoutKitTelemetryTests"
        ),
        .testTarget(
            name: "ShopifyCheckoutTests",
            dependencies: ["ShopifyCheckoutKit", "CheckoutKitTelemetry"],
            path: "platforms/swift/Tests/ShopifyCheckoutTests"
        ),
        .testTarget(
            name: "ShopifyAcceleratedCheckoutsTests",
            dependencies: [
                "ShopifyAcceleratedCheckouts",
                .product(name: "ViewInspector", package: "ViewInspector")
            ],
            path: "platforms/swift/Tests/ShopifyAcceleratedCheckoutsTests"
        )
    ],
    swiftLanguageModes: [.v6]
)
