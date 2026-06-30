// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "EmbeddedCheckoutProtocol",
    platforms: [
        .iOS(.v15),
        .macOS(.v10_15),
    ],
    products: [
        .library(
            name: "EmbeddedCheckoutProtocol",
            targets: ["EmbeddedCheckoutProtocol"]
        ),
    ],
    targets: [
        .target(
            name: "EmbeddedCheckoutProtocol",
            path: "Sources/UniversalCommerceProtocol/EmbeddedCheckoutProtocol"
        ),
        .testTarget(
            name: "EmbeddedCheckoutProtocolTests",
            dependencies: ["EmbeddedCheckoutProtocol"],
            path: "Tests/EmbeddedCheckoutProtocolTests",
            resources: [
                .copy("Fixtures"),
            ]
        ),
    ]
)
