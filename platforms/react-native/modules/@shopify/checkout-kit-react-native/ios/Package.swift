// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "RNShopifyCheckoutKitProtocolRelay",
    platforms: [.iOS(.v15), .macOS(.v10_15)],
    products: [
        .library(name: "RNShopifyCheckoutKitProtocolRelay", targets: ["RNShopifyCheckoutKitProtocolRelay"])
    ],
    dependencies: [
        .package(path: "../../../../../../protocol/languages/swift")
    ],
    targets: [
        .target(
            name: "RNShopifyCheckoutKitProtocolRelay",
            dependencies: [
                .product(name: "ShopifyCheckoutProtocol", package: "swift")
            ],
            path: ".",
            sources: ["ProtocolRelay.swift"]
        ),
        .testTarget(
            name: "RNShopifyCheckoutKitProtocolRelayTests",
            dependencies: ["RNShopifyCheckoutKitProtocolRelay"],
            path: "Tests"
        )
    ]
)
