// swift-tools-version: 6.0

import PackageDescription

let reactNativeHeaders: [Target.Dependency] = [
    .product(name: "ReactHeaders", package: "ReactNative"),
    .product(name: "ReactNativeHeaders", package: "ReactNative"),
    .product(name: "ReactNativeDependenciesHeaders", package: "ReactNative")
]

let package = Package(
    name: "CheckoutKitReactNative",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CheckoutKitReactNative",
            targets: [
                "CheckoutKitReactNativeSwift",
                "CheckoutKitReactNativeObjC",
                "CheckoutKitReactNativeCodegen"
            ]
        )
    ],
    dependencies: [
        .package(name: "ReactNative", path: "../../../../xcframeworks"),
        .package(
            url: "https://github.com/Shopify/checkout-kit",
            exact: "4.0.0-alpha.5"
        )
    ],
    targets: [
        .target(
            name: "CheckoutKitReactNativeSwift",
            dependencies: reactNativeHeaders + [
                .product(name: "ShopifyCheckoutKit", package: "checkout-kit"),
                .product(name: "ShopifyAcceleratedCheckouts", package: "checkout-kit")
            ],
            path: ".",
            sources: [
                "AcceleratedCheckoutButtons+Extensions.swift",
                "AcceleratedCheckoutButtons.swift",
                "ProtocolRelay.swift",
                "ShopifyCheckoutKit+EventSerialization.swift",
                "ShopifyCheckoutKit+Extensions.swift",
                "ShopifyCheckoutKit.swift"
            ],
            swiftSettings: [.swiftLanguageMode(.v5)]
        ),
        .target(
            name: "CheckoutKitReactNativeObjC",
            dependencies: reactNativeHeaders + ["CheckoutKitReactNativeCodegen"],
            path: ".",
            sources: ["ShopifyCheckoutKit.mm"],
            publicHeadersPath: ".",
            cxxSettings: [
                .define("FOLLY_CFG_NO_COROUTINES", to: "1"),
                .define("DEBUG", .when(configuration: .debug)),
                .define("NDEBUG", .when(configuration: .release))
            ]
        ),
        .target(
            name: "CheckoutKitReactNativeCodegen",
            dependencies: reactNativeHeaders,
            path: "generated/ReactCodegen",
            publicHeadersPath: ".",
            cxxSettings: [
                .define("FOLLY_CFG_NO_COROUTINES", to: "1"),
                .define("DEBUG", .when(configuration: .debug)),
                .define("NDEBUG", .when(configuration: .release))
            ],
            linkerSettings: [.linkedFramework("Foundation")]
        )
    ],
    cxxLanguageStandard: .cxx20
)
