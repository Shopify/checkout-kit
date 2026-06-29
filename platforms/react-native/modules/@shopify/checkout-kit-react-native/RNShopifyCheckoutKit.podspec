require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))
ios_native_sdk_version = package.dig("checkoutKit", "nativeSdkVersions", "ios")

raise "checkoutKit.nativeSdkVersions.ios is required in package.json" if ios_native_sdk_version.to_s.empty?

Pod::Spec.new do |s|
  s.name         = "RNShopifyCheckoutKit"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "15.0" }
  s.source       = { :git => "https://github.com/Shopify/checkout-kit.git", :tag => "react-native/#{s.version}" }

  s.source_files = "ios/*.{h,m,mm,swift}"

  s.dependency "React-Core"

  use_local_sdk = ENV['USE_LOCAL_SDK'] == '1'

  if use_local_sdk
    s.dependency "ShopifyCheckoutKit"
    s.dependency "ShopifyCheckoutKit/AcceleratedCheckouts"
  else
    s.dependency "ShopifyCheckoutKit", "~> #{ios_native_sdk_version}"
    s.dependency "ShopifyCheckoutKit/AcceleratedCheckouts", "~> #{ios_native_sdk_version}"
  end

  install_modules_dependencies(s)
end
