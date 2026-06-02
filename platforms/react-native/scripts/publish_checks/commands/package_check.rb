# frozen_string_literal: true

require 'fileutils'
require 'json'
require 'optparse'
require 'tmpdir'

require_relative '../support/checkout_kit_packager'
require_relative '../support/shared'
require_relative '../support/package_manager'
require_relative '../support/packed_tarball'
require_relative '../support/temp_workspace'

module PublishChecks
  module Commands
    class PackageCheck
      PACKAGE_NAME = PackedTarball::PACKAGE_NAME
      PROTOCOL_PACKAGE = PackedTarball::PROTOCOL_PACKAGE
      SUPPORTED_MANAGERS = %w[pnpm npm yarn bun].freeze

      def self.run(argv, react_native_root:)
        new(argv, react_native_root: react_native_root).run
      end

      def initialize(argv, react_native_root:)
        @react_native_root = react_native_root
        @options = default_options
        @install_dirs = []
        parse!(argv)
      end

      def run
        managers = expand_package_managers(@options[:package_managers])
        raise 'PACKAGE_MANAGERS must include at least one package manager' if managers.empty?

        package_managers = managers.map do |manager_name|
          PackageManager.new(name: manager_name, registry: @options[:registry]).tap(&:ensure_available!)
        end
        print_configuration(package_managers)

        tarball_path = CheckoutKitPackager.new(
          react_native_root: @react_native_root,
          pack_dir: pack_dir(package_managers)
        ).pack(dry_run: true)

        tarball = PackedTarball.new(tarball_path)
        tarball.print_contents if Shell.verbose?
        tarball.print_packed_manifest_summary if Shell.verbose?
        tarball.validate_manifest!

        puts "Package managers to test: #{managers.join(' ')}"

        success = false
        begin
          package_managers.each do |package_manager|
            manager_name = package_manager.name
            install_dir = create_install_fixture(package_manager)
            @install_dirs << install_dir
            write_install_fixture_project(install_dir)

            install_tarball(package_manager, tarball.path, install_dir)

            if Shell.verbose?
              Shell.section("Installed package manifest dependency summary (#{manager_name})")
              print_installed_manifest_summary(install_dir, manager_name)
            end
            verify_bundled_protocol_installed(install_dir, tarball, manager_name)
          rescue StandardError => e
            puts
            puts "#{manager_name} clean package install failed. The tarball may still depend on packages that are not published/installable from #{@options[:registry]}, or this package manager may not support the package shape."
            puts "Tarball: #{tarball.path}"
            raise e
          end

          success = true
          Shell.section('Publish package check passed')
          puts "Packed tarball is installable from clean install fixtures with: #{managers.join(' ')}"
          puts "Tarball: #{tarball.path}"
        ensure
          cleanup_install_dirs(success: success)
        end
      end

      private

      def default_options
        {
          pack_dir: ENV['PACK_DIR'],
          registry: ENV.fetch('INSTALL_REGISTRY', 'https://registry.npmjs.org/'),
          keep_tmp: Env.bool('KEEP_TMP', false),
          package_managers: ENV.fetch('PACKAGE_MANAGERS', 'pnpm')
        }
      end

      def print_configuration(package_managers)
        ConfigSummary.print(
          'Package release validation configuration',
          values: @options.merge(
            package_manager_namespaces: package_managers.map(&:namespace),
            package_manager_binaries: package_managers.to_h { |package_manager| [package_manager.name, package_manager.resolved_binary] },
            resolved_pack_dir: pack_dir(package_managers)
          )
        )
      end

      def parse!(argv)
        OptionParser.new do |opts|
          opts.banner = 'Usage: validate_release package [options]'
          opts.separator ''
          opts.separator 'Packs @shopify/checkout-kit-react-native and verifies the tarball installs from clean install fixtures.'

          opts.on('--package-managers LIST', 'Package managers to test: comma/space list or all') { |value| @options[:package_managers] = value }
          opts.on('--pack-dir PATH', 'Directory for the packed tarball') { |value| @options[:pack_dir] = value }
          opts.on('--registry URL', 'Registry used for package installs') { |value| @options[:registry] = value }
          opts.on('--verbose', 'Print resolved configuration and stream stdout from package managers and pack commands') { Shell.verbose = true }
          opts.on('--cleanup', 'Delete install fixtures on success') { @options[:keep_tmp] = false }
          opts.on('--keep-tmp', 'Preserve install fixtures on success') { @options[:keep_tmp] = true }
          opts.separator ''
          opts.separator 'Environment:'
          opts.separator '  PACKAGE_MANAGERS, PACK_DIR, INSTALL_REGISTRY, KEEP_TMP, VERBOSE'
          opts.separator '  Package manager binaries: PNPM_BIN, NPM_BIN, YARN_BIN, BUN_BIN'
          opts.separator '  Bun exec binary: BUNX_BIN'
          opts.on('-h', '--help', 'Show this help') do
            puts opts
            exit 0
          end
        end.parse!(argv)

        raise "Unknown arguments: #{argv.join(' ')}" unless argv.empty?
      end

      def pack_dir(package_managers)
        namespace = package_managers.map(&:namespace).join('+')
        @options[:pack_dir] || TempWorkspace.default_pack_dir('package', namespace)
      end

      def expand_package_managers(requested)
        managers = requested.to_s.tr(',', ' ').split
        managers = SUPPORTED_MANAGERS if managers == ['all']
        unsupported = managers - SUPPORTED_MANAGERS
        unless unsupported.empty?
          raise "Unsupported package manager(s): #{unsupported.join(', ')}. Use one of: #{SUPPORTED_MANAGERS.join(', ')}, all"
        end
        managers
      end

      def create_install_fixture(package_manager)
        TempWorkspace.mktmpdir(
          :installs,
          "react-native-publish-install-#{package_manager.name}.",
          namespace: [package_manager.namespace]
        )
      end

      def write_install_fixture_project(install_dir)
        FileUtils.mkdir_p(install_dir)
        File.write(File.join(install_dir, 'package.json'), <<~JSON)
          {
            "name": "react-native-publish-install-check",
            "version": "1.0.0",
            "private": true
          }
        JSON
      end

      def install_tarball(package_manager, tarball, install_dir)
        package_manager.write_config(install_dir)

        Shell.section("Attempting clean package install with #{package_manager.name}")
        Shell.detail("Install fixture: #{install_dir}")
        Shell.detail("Registry: #{@options[:registry]}")
        Shell.detail("Namespace: #{package_manager.namespace}")
        Shell.detail("Binary: #{package_manager.resolved_binary}")

        package_manager.add(install_dir, tarball)
      end

      def print_installed_manifest_summary(install_dir, manager_name)
        manifest_path = File.join(install_dir, 'node_modules', PACKAGE_NAME, 'package.json')
        unless File.file?(manifest_path)
          raise "#{manager_name} install completed, but #{manifest_path} was not found"
        end

        manifest = JSON.parse(File.read(manifest_path))
        puts JSON.pretty_generate(
          {
            name: manifest['name'],
            version: manifest['version'],
            dependencies: manifest['dependencies'],
            devDependencies: manifest['devDependencies'],
            peerDependencies: manifest['peerDependencies'],
            bundledDependencies: manifest['bundledDependencies'] || manifest['bundleDependencies']
          }
        )
      end

      def verify_bundled_protocol_installed(install_dir, tarball, manager_name)
        return unless tarball.references_protocol_package?

        package_root = File.realpath(File.join(install_dir, 'node_modules', PACKAGE_NAME))
        protocol_manifest = File.join(package_root, 'node_modules', PROTOCOL_PACKAGE, 'package.json')
        unless File.file?(protocol_manifest)
          raise "#{manager_name} install completed, but bundled #{PROTOCOL_PACKAGE} was not installed at #{protocol_manifest}"
        end

        resolved = resolve_node_package(PROTOCOL_PACKAGE, from: File.join(package_root, 'lib/commonjs'))
        expected_prefix = File.realpath(File.join(package_root, 'node_modules'))
        unless resolved.start_with?(expected_prefix)
          raise "#{PROTOCOL_PACKAGE} resolved outside the installed RN package: #{resolved}"
        end

        Shell.detail("Node-style resolver finds bundled protocol manifest at: #{resolved}")
        puts "#{manager_name} installed bundled #{PROTOCOL_PACKAGE}."
      end

      def resolve_node_package(package_name, from:)
        current = File.expand_path(from)
        loop do
          candidate = File.join(current, 'node_modules', package_name, 'package.json')
          return File.realpath(candidate) if File.file?(candidate)

          parent = File.dirname(current)
          break if parent == current

          current = parent
        end

        raise "Could not resolve #{package_name} from #{from}"
      end

      def cleanup_install_dirs(success:)
        @install_dirs.each do |install_dir|
          if success && !@options[:keep_tmp]
            FileUtils.rm_rf(install_dir)
          elsif File.directory?(install_dir)
            puts "Package install fixture preserved at: #{install_dir}"
          end
        end
      end
    end
  end
end
