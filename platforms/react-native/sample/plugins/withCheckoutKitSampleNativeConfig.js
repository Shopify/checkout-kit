const fs = require('fs');
const path = require('path');
const {
  AndroidConfig,
  withAndroidManifest,
  withAppBuildGradle,
  withDangerousMod,
  withEntitlementsPlist,
  withInfoPlist,
  withPodfile,
  withProjectBuildGradle,
  withSettingsGradle,
} = require('@expo/config-plugins');

function replaceOnce(contents, search, replacement) {
  return contents.includes(replacement) ? contents : contents.replace(search, replacement);
}

function copyFileIfExists(from, to) {
  if (!fs.existsSync(from)) {
    return;
  }
  fs.mkdirSync(path.dirname(to), {recursive: true});
  fs.copyFileSync(from, to);
}

function withIosLocalSdkPodfile(config) {
  return withPodfile(config, mod => {
    const podspecSourcesPatch = `
::Pod.define_singleton_method(:podspec_sources) do |original_sources, _sources_for_prebuilds|
  original_sources
end

{
  use_hermes: -> { true },
  use_third_party_jsc: -> { false },
  use_hermes_flags: -> { '-DUSE_HERMES=1' },
  js_engine_flags: -> { '-DUSE_HERMES=1' },
  depend_on_js_engine: ->(spec) { spec.dependency 'hermes-engine' },
  add_rn_third_party_dependencies: ->(_spec) {},
  add_rncore_dependency: ->(_spec) {},
  resolve_use_frameworks: ->(_spec, **_options) {},
}.each do |name, fallback|
  begin
    implementation = method(name)
    ::Pod.define_singleton_method(name) do |*args, **kwargs, &block|
      kwargs.empty? ? implementation.call(*args, &block) : implementation.call(*args, **kwargs, &block)
    end
  rescue NameError
    ::Pod.define_singleton_method(name, fallback)
  end
end

::Pod.define_singleton_method(:add_rn_third_party_dependencies) do |_spec|
end

::Pod.define_singleton_method(:add_rncore_dependency) do |_spec|
end
`;
    if (!mod.modResults.contents.includes('def self.podspec_sources')) {
      mod.modResults.contents = mod.modResults.contents.replace(/(require .*react_native_pods.*strip\n)/, `$1${podspecSourcesPatch}`);
    }

    const localPods = `
  use_local_sdk = ENV['USE_LOCAL_SDK'] == '1'

  if use_local_sdk
    shopify_kit_path = '../../../../'
    pod 'ShopifyCheckoutKit',                       :path => shopify_kit_path
    pod 'ShopifyCheckoutKit/AcceleratedCheckouts',  :path => shopify_kit_path
  end
`;
    mod.modResults.contents = replaceOnce(
      mod.modResults.contents,
      /target ['"]CheckoutKitReactNativeDemo['"] do\n/,
      match => `${match}${localPods}`,
    );
    return mod;
  });
}

function withAndroidLocalSdk(config) {
  config = withSettingsGradle(config, mod => {
    let contents = mod.modResults.contents;
    if (contents.includes('includeModule("com.shopify", "checkout-kit")')) {
      return mod;
    }
    const localSdkRepositories = `
dependencyResolutionManagement {
    repositories {
        if ((System.getenv("USE_LOCAL_SDK") ?: "0") == "1") {
            exclusiveContent {
                forRepository {
                    mavenLocal {
                        metadataSources {
                            mavenPom()
                            artifact()
                            ignoreGradleMetadataRedirection()
                        }
                    }
                }
                filter { includeModule("com.shopify", "checkout-kit") }
            }
        }
        google()
        mavenCentral()
    }
}
`;
    contents += localSdkRepositories;
    mod.modResults.contents = contents;
    return mod;
  });

  config = withProjectBuildGradle(config, mod => {
    if (mod.modResults.language !== 'groovy') {
      return mod;
    }
    const localRepo = `
def useLocalSdk = (System.getenv("USE_LOCAL_SDK") ?: "0") == "1"

allprojects {
    repositories {
        if (useLocalSdk) {
            exclusiveContent {
                forRepository {
                    mavenLocal {
                        metadataSources {
                            mavenPom()
                            artifact()
                            ignoreGradleMetadataRedirection()
                        }
                    }
                }
                filter { includeModule("com.shopify", "checkout-kit") }
            }
        }
    }
}
`;
    if (!mod.modResults.contents.includes('def useLocalSdk = (System.getenv("USE_LOCAL_SDK")')) {
      mod.modResults.contents += localRepo;
    }
    return mod;
  });

  return withAppBuildGradle(config, mod => {
    if (mod.modResults.language !== 'groovy') {
      return mod;
    }
    let contents = mod.modResults.contents;
    contents = replaceOnce(
      contents,
      /release \{\n\s+signingConfig signingConfigs\.debug\n/,
      `release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
`,
    );
    contents = replaceOnce(
      contents,
      /debug \{\n\s+signingConfig signingConfigs\.debug\n\s+}\n/,
      `debug {
            signingConfig signingConfigs.debug
        }
`,
    );
    mod.modResults.contents = contents;
    return mod;
  });
}

function withAndroidNetworkSecurity(config) {
  config = withDangerousMod(config, ['android', mod => {
    copyFileIfExists(
      path.join(mod.modRequest.projectRoot, 'native/android/res/xml/network_security_config.xml'),
      path.join(mod.modRequest.platformProjectRoot, 'app/src/main/res/xml/network_security_config.xml'),
    );
    return mod;
  }]);

  return withAndroidManifest(config, mod => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    return mod;
  });
}

function withIosPrivacy(config) {
  return withDangerousMod(config, ['ios', mod => {
    copyFileIfExists(
      path.join(mod.modRequest.projectRoot, 'native/ios/PrivacyInfo.xcprivacy'),
      path.join(mod.modRequest.platformProjectRoot, 'CheckoutKitReactNativeDemo/PrivacyInfo.xcprivacy'),
    );
    return mod;
  }]);
}

function withGeneratedLinks(config) {
  config = withInfoPlist(config, mod => {
    const schemes = config.scheme ?? [];
    const schemeList = Array.isArray(schemes) ? schemes : [schemes];
    mod.modResults.CFBundleURLTypes = schemeList.map(scheme => ({
      CFBundleURLSchemes: [scheme],
    }));
    return mod;
  });

  return withEntitlementsPlist(config, mod => {
    const associatedDomains = config.ios?.associatedDomains ?? [];
    if (associatedDomains.length) {
      mod.modResults['com.apple.developer.associated-domains'] = associatedDomains;
    }
    const merchantIdentifiers = config.ios?.entitlements?.['com.apple.developer.in-app-payments'];
    if (merchantIdentifiers) {
      mod.modResults['com.apple.developer.in-app-payments'] = merchantIdentifiers;
    }
    return mod;
  });
}

module.exports = function withCheckoutKitSampleNativeConfig(config) {
  config = withIosLocalSdkPodfile(config);
  config = withAndroidLocalSdk(config);
  config = withAndroidNetworkSecurity(config);
  config = withIosPrivacy(config);
  config = withGeneratedLinks(config);
  return config;
};
