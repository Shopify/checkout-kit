# frozen_string_literal: true

require 'fileutils'
require 'json'
require 'optparse'

require_relative '../support/app_generators/expo_app_generator'
require_relative '../support/checkout_kit_packager'
require_relative '../support/shared'
require_relative '../support/generated_app'
require_relative '../support/native_build'
require_relative '../support/package_manager'
require_relative '../support/package_verifier'
require_relative '../support/temp_workspace'

module PublishChecks
  module Commands
    class ExpoApp
      APP_NAME = 'CheckoutKitExpoSmoke'
      APP_SLUG = 'checkout-kit-expo-smoke'
      APP_SCHEME = 'checkoutkitexposmoke'
      APP_PACKAGE = 'com.shopify.checkoutkitexposmoke'

      def self.run(argv, react_native_root:)
        new(argv, react_native_root: react_native_root).run
      end

      def initialize(argv, react_native_root:)
        @react_native_root = react_native_root
        @options = default_options
        parse!(argv)
      end

      def run
        validate_options!
        pm = PackageManager.new(name: @options[:package_manager], registry: @options[:registry])
        pm.ensure_available!
        print_configuration(pm)

        app = nil
        success = false

        begin
          tarball = CheckoutKitPackager.new(
            react_native_root: @react_native_root,
            pack_dir: pack_dir(pm)
          ).pack

          app = GeneratedApp.create(
            app_dir: @options[:app_dir],
            app_name: APP_NAME,
            keep_on_success: @options[:keep_tmp],
            replace_existing: @options[:replace_app_dir],
            temp_namespace: ['expo', pm.namespace]
          )
          app.prepare!

          ExpoAppGenerator.new(
            template: @options[:expo_template],
            registry: @options[:registry]
          ).generate(app.path)

          Shell.section('Writing Expo smoke app files')
          pm.write_config(app.path)
          configure_package_json(app.path)
          configure_app_json(app.path)
          write_smoke_config(app.path)
          write_app_tsx(app.path)

          pm.install(app.path)
          pm.add(app.path, "file:#{tarball}")
          install_expo_dev_client_if_needed(pm, app.path)

          PackageVerifier.verify_installed_tarball(app.path)

          if @options[:prebuild]
            Shell.section("Running Expo prebuild for #{@options[:platform]}")
            pm.exec(app.path, 'expo', 'prebuild', '--platform', @options[:platform], '--clean')
          else
            Shell.section("PREBUILD=0; skipping expo prebuild for #{@options[:platform]}")
          end

          if @options[:build_native]
            NativeBuild.new(
              app_dir: app.path,
              platform: @options[:platform],
              ios_configuration: @options[:ios_configuration],
              ios_destination: @options[:ios_destination],
              android_gradle_task: @options[:android_gradle_task]
            ).build
          else
            Shell.section("BUILD_NATIVE=0; skipping native #{@options[:platform]} build")
          end

          run_app_if_requested(pm, app.path)

          success = true
          Shell.section('Expo generated app release validation passed')
          puts "App dir: #{app.path}"
          puts "Tarball: #{tarball}"
          puts @options[:build_native] ? "Native #{@options[:platform]} build completed." : "Native #{@options[:platform]} build was skipped."
          unless @options[:run_app]
            puts 'Metro and simulator/device launch were skipped.'
            puts 'Run the app manually with:'
            puts "  cd #{app.path}"
            puts "  #{File.basename(pm.binary)} expo run:#{@options[:platform]}"
          end
        ensure
          app&.cleanup(success: success)
        end
      end

      private

      def default_options
        {
          app_dir: ENV.fetch('APP_DIR', nil),
          pack_dir: ENV['PACK_DIR'],
          keep_tmp: Env.bool('KEEP_TMP', true),
          replace_app_dir: Env.bool('REPLACE_APP_DIR', false),
          package_manager: ENV.fetch('PACKAGE_MANAGER', 'pnpm'),
          registry: ENV.fetch('INSTALL_REGISTRY', 'https://registry.npmjs.org/'),
          platform: ENV.fetch('PLATFORM', 'ios'),
          prebuild: Env.bool('PREBUILD', true),
          build_native: Env.bool('BUILD_NATIVE', true),
          run_app: Env.bool('RUN_APP', false),
          install_expo_dev_client: Env.bool('INSTALL_EXPO_DEV_CLIENT', true),
          expo_template: ENV.fetch('EXPO_TEMPLATE', 'expo-template-blank-typescript@sdk-55'),
          ios_configuration: ENV.fetch('IOS_CONFIGURATION', 'Debug'),
          ios_destination: ENV.fetch('IOS_XCODEBUILD_DESTINATION', 'generic/platform=iOS Simulator'),
          android_gradle_task: ENV.fetch('ANDROID_GRADLE_TASK', ':app:assembleDebug'),
          ios_simulator: ENV.fetch('IOS_SIMULATOR', nil),
          android_device: ENV.fetch('ANDROID_DEVICE', nil),
          storefront_domain: config_value('STOREFRONT_DOMAIN'),
          storefront_access_token: config_value('STOREFRONT_ACCESS_TOKEN'),
          storefront_version: config_value('STOREFRONT_VERSION', fallback_key: 'API_VERSION', default: '2024-04'),
          checkout_url: config_value('CHECKOUT_URL')
        }
      end

      def root_env
        @root_env ||= Dotenv.read(File.join(repo_root, '.env'))
      end

      def react_native_sample_env
        @react_native_sample_env ||= Dotenv.read(File.join(@react_native_root, 'sample/.env'))
      end

      def repo_root
        @repo_root ||= File.expand_path('../..', @react_native_root)
      end

      def config_value(key, fallback_key: nil, default: '')
        config_entry(key, fallback_key: fallback_key)&.fetch(:value) || default
      end

      def config_source(key, fallback_key: nil)
        config_entry(key, fallback_key: fallback_key)&.fetch(:source) || 'not configured'
      end

      def config_entry(key, fallback_key: nil)
        config_keys = [key, fallback_key].compact
        config_sources = [
          [ENV, 'environment'],
          [root_env, 'root .env'],
          [react_native_sample_env, 'platforms/react-native/sample/.env']
        ]

        config_sources.each do |source, source_name|
          config_keys.each do |config_key|
            value = source[config_key]
            return {value: value, source: source_name} unless value.nil? || value.empty?
          end
        end

        nil
      end

      def print_configuration(package_manager)
        ConfigSummary.print(
          'Expo release validation configuration',
          values: @options.merge(
            package_manager_namespace: package_manager.namespace,
            resolved_package_manager_binary: package_manager.resolved_binary,
            resolved_pack_dir: pack_dir(package_manager)
          )
        )
      end

      def parse!(argv)
        OptionParser.new do |opts|
          opts.banner = 'Usage: validate_release expo [options]'
          opts.separator ''
          opts.separator 'Generates a fresh Expo app with create-expo-app, installs the packed tarball, and runs Expo/native smoke checks.'

          opts.on('--template TEMPLATE', 'Expo template passed to create-expo-app') { |value| @options[:expo_template] = value }
          opts.on('--platform PLATFORM', 'ios or android') { |value| @options[:platform] = value }
          opts.on('--package-manager NAME', 'pnpm, npm, yarn, or bun') { |value| @options[:package_manager] = value }
          opts.on('--app-dir PATH', 'Use a specific generated app directory') { |value| @options[:app_dir] = value }
          opts.on('--pack-dir PATH', 'Directory for the packed tarball') { |value| @options[:pack_dir] = value }
          opts.on('--registry URL', 'Registry used for package installs') { |value| @options[:registry] = value }
          opts.on('--verbose', 'Print resolved configuration and stream stdout from package managers, app generators, and build tools') { Shell.verbose = true }
          opts.on('--cleanup', 'Delete temp-created generated app on success') { @options[:keep_tmp] = false }
          opts.on('--keep-tmp', 'Preserve generated app on success') { @options[:keep_tmp] = true }
          opts.on('--replace-app-dir', 'Remove an existing APP_DIR before generating the app') { @options[:replace_app_dir] = true }
          opts.on('--prebuild', 'Run expo prebuild') { @options[:prebuild] = true }
          opts.on('--skip-prebuild', 'Skip expo prebuild') { @options[:prebuild] = false }
          opts.on('--build-native', 'Compile the generated native app') { @options[:build_native] = true }
          opts.on('--skip-native-build', 'Skip native compilation') { @options[:build_native] = false }
          opts.on('--run-app', 'Launch the generated app on simulator/device') { @options[:run_app] = true }
          opts.on('--skip-run-app', 'Skip simulator/device launch') { @options[:run_app] = false }
          opts.on('--install-expo-dev-client', 'Install expo-dev-client using Expo CLI') { @options[:install_expo_dev_client] = true }
          opts.on('--skip-expo-dev-client', 'Do not install expo-dev-client') { @options[:install_expo_dev_client] = false }
          opts.on('--ios-configuration CONFIGURATION', 'xcodebuild configuration') { |value| @options[:ios_configuration] = value }
          opts.on('--ios-destination DESTINATION', 'xcodebuild destination') { |value| @options[:ios_destination] = value }
          opts.on('--android-gradle-task TASK', 'Android Gradle task') { |value| @options[:android_gradle_task] = value }
          opts.separator ''
          opts.separator 'Environment:'
          opts.separator '  APP_DIR, PACK_DIR, KEEP_TMP, PACKAGE_MANAGER, INSTALL_REGISTRY, PLATFORM, VERBOSE'
          opts.separator '  Package manager binaries: PNPM_BIN, NPM_BIN, YARN_BIN, BUN_BIN'
          opts.separator '  Bun exec binary: BUNX_BIN'
          opts.separator '  create-expo-app npm binary: CREATE_EXPO_APP_NPM_BIN'
          opts.separator '  Expo/native: EXPO_TEMPLATE, PREBUILD, BUILD_NATIVE, RUN_APP, IOS_CONFIGURATION, IOS_XCODEBUILD_DESTINATION, ANDROID_GRADLE_TASK'
          opts.separator '  Launch config: STOREFRONT_DOMAIN, STOREFRONT_ACCESS_TOKEN, CHECKOUT_URL, STOREFRONT_VERSION/API_VERSION from env, root .env, or sample/.env'
          opts.on('-h', '--help', 'Show this help') do
            puts opts
            exit 0
          end
        end.parse!(argv)

        raise "Unknown arguments: #{argv.join(' ')}" unless argv.empty?
      end

      def validate_options!
        raise "PLATFORM must be ios or android, got #{@options[:platform].inspect}" unless %w[ios android].include?(@options[:platform])
      end

      def pack_dir(package_manager)
        @options[:pack_dir] || TempWorkspace.default_pack_dir('expo', package_manager.namespace)
      end

      def configure_package_json(app_dir)
        JsonFile.update(File.join(app_dir, 'package.json')) do |pkg|
          pkg['scripts'] ||= {}
          pkg['scripts']['bundle:ios'] = 'expo export --platform ios --output-dir dist-ios --clear'
          pkg['scripts']['bundle:android'] = 'expo export --platform android --output-dir dist-android --clear'
        end
      end

      def configure_app_json(app_dir)
        JsonFile.update(File.join(app_dir, 'app.json')) do |app|
          app['expo'] ||= {}
          app['expo']['name'] = APP_NAME
          app['expo']['slug'] = APP_SLUG
          app['expo']['scheme'] = APP_SCHEME
          app['expo']['newArchEnabled'] = true
          app['expo']['ios'] ||= {}
          app['expo']['ios']['bundleIdentifier'] = APP_PACKAGE
          app['expo']['android'] ||= {}
          app['expo']['android']['package'] = APP_PACKAGE
        end
      end

      def write_smoke_config(app_dir)
        config = {
          storefrontDomain: @options[:storefront_domain],
          storefrontAccessToken: @options[:storefront_access_token],
          storefrontVersion: @options[:storefront_version],
          checkoutUrl: @options[:checkout_url]
        }
        File.write(File.join(app_dir, 'smoke.config.json'), "#{JSON.pretty_generate(config)}\n")

        puts "Storefront domain: #{config[:storefrontDomain].empty? ? 'missing' : config[:storefrontDomain]} from #{config_source('STOREFRONT_DOMAIN')}"
        puts "Storefront access token: #{Redaction.configured_summary(config[:storefrontAccessToken], label: 'token')} from #{config_source('STOREFRONT_ACCESS_TOKEN')}"
        puts "Checkout URL: #{Redaction.presence(config[:checkoutUrl])}"
        puts "Storefront API version: #{config[:storefrontVersion]} from #{config_source('STOREFRONT_VERSION', fallback_key: 'API_VERSION')}"
      end

      def write_app_tsx(app_dir)
        template = File.expand_path('../support/templates/expo/App.tsx', __dir__)
        FileUtils.cp(template, File.join(app_dir, 'App.tsx'))
      end

      def install_expo_dev_client_if_needed(pm, app_dir)
        return unless @options[:install_expo_dev_client]
        return unless @options[:prebuild] || @options[:run_app]

        Shell.section('Installing expo-dev-client with Expo CLI')
        pm.exec(app_dir, 'expo', 'install', 'expo-dev-client')
      end

      def run_app_if_requested(pm, app_dir)
        unless @options[:run_app]
          Shell.section("RUN_APP=0; skipping expo run:#{@options[:platform]}")
          return
        end

        Shell.section("Running Expo app on #{@options[:platform]}")
        if @options[:platform] == 'ios'
          args = ['expo', 'run:ios']
          args.concat(['--simulator', @options[:ios_simulator]]) if @options[:ios_simulator] && !@options[:ios_simulator].empty?
          pm.exec(app_dir, *args)
        else
          args = ['expo', 'run:android']
          args.concat(['--device', @options[:android_device]]) if @options[:android_device] && !@options[:android_device].empty?
          pm.exec(app_dir, *args)
        end
      end
    end
  end
end
