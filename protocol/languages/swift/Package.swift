// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "ShopifyCheckoutProtocol",
    platforms: [
        .iOS(.v13),
        .macOS(.v10_15),
    ],
    products: [
        .library(
            name: "ShopifyCheckoutProtocol",
            targets: ["ShopifyCheckoutProtocol"]
        ),
    ],
    targets: [
        .target(
            name: "ShopifyCheckoutProtocol",
            path: "Sources/ShopifyCheckoutProtocol"
        ),
        .testTarget(
            name: "ShopifyCheckoutProtocolTests",
            dependencies: ["ShopifyCheckoutProtocol"],
            path: "Tests/ShopifyCheckoutProtocolTests",
            resources: [
                .copy("Fixtures"),
            ]
        ),
    ]
)
