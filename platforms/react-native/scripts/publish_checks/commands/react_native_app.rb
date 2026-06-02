# frozen_string_literal: true

require 'fileutils'
require 'json'
require 'optparse'

require_relative '../support/app_generators/react_native_app_generator'
require_relative '../support/checkout_kit_packager'
require_relative '../support/shared'
require_relative '../support/generated_app'
require_relative '../support/native_build'
require_relative '../support/package_manager'
require_relative '../support/package_verifier'
require_relative '../support/temp_workspace'

module PublishChecks
  module Commands
    class ReactNativeApp
      DEFAULT_REACT_NATIVE_VERSION = '0.80.2'
      APP_NAME = ReactNativeAppGenerator::APP_NAME

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
            temp_namespace: ['react-native', pm.namespace]
          )
          app.prepare!

          ReactNativeAppGenerator.new(
            version: @options[:react_native_version],
            template: @options[:react_native_template],
            registry: @options[:registry]
          ).generate(app.path)

          Shell.section('Writing React Native smoke app files')
          pm.write_config(app.path)
          configure_package_json(app.path)
          write_protocol_runtime_entry(app.path)
          write_public_api_entry(app.path)
          FileUtils.mkdir_p(File.join(app.path, 'dist'))

          pm.install(app.path)
          pm.add(app.path, "file:#{tarball}")

          PackageVerifier.verify_installed_tarball(app.path)

          Shell.section('Bundling and executing protocol-only runtime smoke entry')
          pm.run_script(app.path, 'bundle:protocol')
          Shell.run('node', "dist/protocol-runtime.#{@options[:platform]}.jsbundle", chdir: app.path)

          Shell.section('Bundling public React Native app entry')
          pm.run_script(app.path, 'bundle:public')

          if @options[:build_native]
            install_pods_if_needed(app.path)
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

          success = true
          Shell.section('React Native generated app release validation passed')
          puts 'Created a throwaway RN app with React Native CLI, installed the tarball, bundled the protocol runtime entry, executed it, and bundled a public API app entry.'
          puts "Tarball: #{tarball}"
          puts "App dir: #{app.path}"
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
          react_native_version: ENV.fetch('REACT_NATIVE_VERSION', DEFAULT_REACT_NATIVE_VERSION),
          react_native_template: ENV.fetch('REACT_NATIVE_TEMPLATE', nil),
          build_native: Env.bool('BUILD_NATIVE', false),
          ios_configuration: ENV.fetch('IOS_CONFIGURATION', 'Debug'),
          ios_destination: ENV.fetch('IOS_XCODEBUILD_DESTINATION', 'generic/platform=iOS Simulator'),
          android_gradle_task: ENV.fetch('ANDROID_GRADLE_TASK', ':app:assembleDebug')
        }
      end

      def print_configuration(package_manager)
        ConfigSummary.print(
          'React Native release validation configuration',
          values: @options.merge(
            package_manager_namespace: package_manager.namespace,
            resolved_package_manager_binary: package_manager.resolved_binary,
            resolved_pack_dir: pack_dir(package_manager)
          )
        )
      end

      def parse!(argv)
        OptionParser.new do |opts|
          opts.banner = 'Usage: validate_release react-native [options]'
          opts.separator ''
          opts.separator 'Generates a fresh React Native app with React Native CLI, installs the packed tarball, and runs bundle/native smoke checks.'

          opts.on('--version VERSION', 'React Native version passed to React Native CLI init') { |value| @options[:react_native_version] = value }
          opts.on('--template TEMPLATE', 'React Native template passed to React Native CLI init') { |value| @options[:react_native_template] = value }
          opts.on('--platform PLATFORM', 'ios or android') { |value| @options[:platform] = value }
          opts.on('--package-manager NAME', 'pnpm, npm, yarn, or bun') { |value| @options[:package_manager] = value }
          opts.on('--app-dir PATH', 'Use a specific generated app directory') { |value| @options[:app_dir] = value }
          opts.on('--pack-dir PATH', 'Directory for the packed tarball') { |value| @options[:pack_dir] = value }
          opts.on('--registry URL', 'Registry used for package installs') { |value| @options[:registry] = value }
          opts.on('--verbose', 'Print resolved configuration and stream stdout from package managers, app generators, and build tools') { Shell.verbose = true }
          opts.on('--cleanup', 'Delete temp-created generated app on success') { @options[:keep_tmp] = false }
          opts.on('--keep-tmp', 'Preserve generated app on success') { @options[:keep_tmp] = true }
          opts.on('--replace-app-dir', 'Remove an existing APP_DIR before generating the app') { @options[:replace_app_dir] = true }
          opts.on('--build-native', 'Compile the generated native app after JS bundle checks') { @options[:build_native] = true }
          opts.on('--skip-native-build', 'Skip native compilation') { @options[:build_native] = false }
          opts.on('--ios-configuration CONFIGURATION', 'xcodebuild configuration') { |value| @options[:ios_configuration] = value }
          opts.on('--ios-destination DESTINATION', 'xcodebuild destination') { |value| @options[:ios_destination] = value }
          opts.on('--android-gradle-task TASK', 'Android Gradle task') { |value| @options[:android_gradle_task] = value }
          opts.separator ''
          opts.separator 'Environment:'
          opts.separator '  APP_DIR, PACK_DIR, KEEP_TMP, PACKAGE_MANAGER, INSTALL_REGISTRY, PLATFORM, VERBOSE'
          opts.separator '  Package manager binaries: PNPM_BIN, NPM_BIN, YARN_BIN, BUN_BIN'
          opts.separator '  Bun exec binary: BUNX_BIN'
          opts.separator '  React Native CLI: REACT_NATIVE_VERSION, REACT_NATIVE_TEMPLATE, REACT_NATIVE_CLI_PACKAGE, CREATE_REACT_NATIVE_APP_NPM_BIN'
          opts.separator '  Native build: BUILD_NATIVE, IOS_CONFIGURATION, IOS_XCODEBUILD_DESTINATION, ANDROID_GRADLE_TASK'
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
        @options[:pack_dir] || TempWorkspace.default_pack_dir('react-native', package_manager.namespace)
      end

      def configure_package_json(app_dir)
        platform = @options[:platform]
        JsonFile.update(File.join(app_dir, 'package.json')) do |pkg|
          pkg['scripts'] ||= {}
          pkg['scripts']['bundle:protocol'] = "react-native bundle --entry-file index.protocol-runtime.js --platform #{platform} --dev false --bundle-output dist/protocol-runtime.#{platform}.jsbundle --assets-dest dist/assets-protocol --reset-cache"
          pkg['scripts']['bundle:public'] = "react-native bundle --entry-file index.public-api.js --platform #{platform} --dev false --bundle-output dist/public-api.#{platform}.jsbundle --assets-dest dist/assets-public --reset-cache"
          pkg['scripts']['run:protocol-bundle'] = "node dist/protocol-runtime.#{platform}.jsbundle"
        end
      end

      def write_protocol_runtime_entry(app_dir)
        File.write(File.join(app_dir, 'index.protocol-runtime.js'), <<~'JS')
          import {
            CheckoutProtocol,
            decodeProtocolPayload,
          } from '@shopify/checkout-kit-react-native/lib/module/protocol';

          if (CheckoutProtocol.start !== 'ec.start') {
            throw new Error(`Unexpected CheckoutProtocol.start: ${CheckoutProtocol.start}`);
          }

          const decoded = decodeProtocolPayload(CheckoutProtocol.error, {
            messages: [],
            ucp: {
              version: '2026-04-08',
              status: 'error',
              payment_handlers: {},
            },
          });

          if (decoded?.ucp?.status !== 'error') {
            throw new Error(`Unexpected decoded protocol payload: ${JSON.stringify(decoded)}`);
          }

          console.log('checkout-kit protocol runtime smoke ok', {
            checkoutProtocol: CheckoutProtocol,
            decodedErrorStatus: decoded.ucp.status,
          });
        JS
      end

      def write_public_api_entry(app_dir)
        File.write(File.join(app_dir, 'index.public-api.js'), <<~JS)
          import React from 'react';
          import {AppRegistry, Text, View} from 'react-native';
          import {CheckoutProtocol} from '@shopify/checkout-kit-react-native';

          function App() {
            return React.createElement(
              View,
              null,
              React.createElement(Text, null, `Protocol start: ${CheckoutProtocol.start}`),
            );
          }

          AppRegistry.registerComponent('#{APP_NAME}', () => App);
        JS
      end

      def install_pods_if_needed(app_dir)
        return unless @options[:platform] == 'ios'
        return unless File.exist?(File.join(app_dir, 'ios/Podfile'))

        Shell.section('Installing React Native iOS pods')
        Shell.run('pod', 'install', chdir: File.join(app_dir, 'ios'))
      end
    end
  end
end
