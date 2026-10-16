// swift-tools-version: 5.9
// Consumer-compatibility check for the Swift protocol package: code written the way apps and hosts
// use the models, built against the package with a plain import.
import PackageDescription

let package = Package(
    name: "CompatConsumer",
    platforms: [.macOS(.v12)],
    dependencies: [
        .package(name: "EmbeddedCheckoutProtocol", path: "../../languages/swift")
    ],
    targets: [
        .executableTarget(
            name: "CompatConsumer",
            dependencies: [.product(name: "EmbeddedCheckoutProtocol", package: "EmbeddedCheckoutProtocol")]
        )
    ]
)
