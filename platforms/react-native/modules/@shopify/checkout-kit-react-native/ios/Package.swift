// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "RNShopifyCheckoutKitCasingTransform",
    platforms: [.iOS(.v13), .macOS(.v10_15)],
    products: [
        .library(name: "RNShopifyCheckoutKitCasingTransform", targets: ["RNShopifyCheckoutKitCasingTransform"])
    ],
    dependencies: [
        .package(path: "../../../../../../protocol/languages/swift")
    ],
    targets: [
        .target(
            name: "RNShopifyCheckoutKitCasingTransform",
            dependencies: [
                .product(name: "ShopifyCheckoutProtocol", package: "swift")
            ],
            path: ".",
            sources: ["CasingTransform.swift", "DispatchEnvelope.swift", "ProtocolRelay.swift"]
        ),
        .testTarget(
            name: "RNShopifyCheckoutKitCasingTransformTests",
            dependencies: ["RNShopifyCheckoutKitCasingTransform"],
            path: "Tests"
        )
    ]
)
