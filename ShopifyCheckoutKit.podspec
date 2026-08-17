Pod::Spec.new do |s|
  s.version = "4.0.0-alpha.5"

  s.name    = "ShopifyCheckoutKit"
  s.summary = "Enables Swift apps to embed the Shopify's highest converting, customizable, one-page checkout."
  s.author  = "Shopify Inc."

  s.homepage  = "https://github.com/Shopify/checkout-kit"
  s.readme    = "https://github.com/Shopify/checkout-kit/blob/main/README.md"
  s.changelog = "https://github.com/Shopify/checkout-kit/releases"
  s.license   = { :type => "MIT", :file => "LICENSE" }

  s.source = {
    :git => "https://github.com/Shopify/checkout-kit.git", :tag => s.version.to_s
  }

  s.swift_version = "6.0"

  s.ios.deployment_target = "15.0"

  s.pod_target_xcconfig = {
    'OTHER_SWIFT_FLAGS' => '-package-name ShopifyCheckoutKit -DCOCOAPODS'
  }

  s.default_subspecs = 'Core'

  s.subspec 'Core' do |core|
    core.source_files = [
      'platforms/swift/Sources/ShopifyCheckoutKit/**/*.swift',
      'protocol/languages/swift/Sources/UniversalCommerceProtocol/EmbeddedCheckoutProtocol/**/*.swift',
    ]
    core.resource_bundles = {
      'ShopifyCheckoutKit' => ['platforms/swift/Sources/ShopifyCheckoutKit/Assets.xcassets']
    }
  end

  s.subspec 'AcceleratedCheckouts' do |accelerated|
    accelerated.source_files = 'platforms/swift/Sources/ShopifyAcceleratedCheckouts/**/*.swift'
    accelerated.dependency 'ShopifyCheckoutKit/Core'
    accelerated.resource_bundles = {
      'ShopifyAcceleratedCheckouts' => [
        'platforms/swift/Sources/ShopifyAcceleratedCheckouts/Localizable.xcstrings',
        'platforms/swift/Sources/ShopifyAcceleratedCheckouts/Media.xcassets',
      ]
    }
  end
end
