Pod::Spec.new do |s|
  s.version = "3.8.0"

  s.name    = "ShopifyCheckoutProtocol"
  s.summary = "Swift bindings for the Universal Commerce Protocol (UCP) embedded checkout specification."
  s.author  = "Shopify Inc."

  s.homepage  = "https://github.com/Shopify/checkout-kit"
  s.readme    = "https://github.com/Shopify/checkout-kit/blob/main/protocol/languages/swift/README.md"
  s.changelog = "https://github.com/Shopify/checkout-kit/releases"
  s.license   = { :type => "MIT", :file => "../../../LICENSE" }

  s.source = {
    :git => "https://github.com/Shopify/checkout-kit.git", :tag => s.version.to_s
  }

  s.swift_version = "5.0"

  s.ios.deployment_target = "13.0"
  s.osx.deployment_target = "10.15"

  s.source_files = "Sources/ShopifyCheckoutProtocol/**/*.swift"
end
