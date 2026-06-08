# frozen_string_literal: true

require 'fileutils'
require 'tmpdir'

require_relative 'shared'

module PublishChecks
  class CheckoutKitPackager
    attr_reader :react_native_root, :pack_dir

    def initialize(react_native_root:, pack_dir:)
      @react_native_root = File.expand_path(react_native_root)
      @pack_dir = File.expand_path(pack_dir)
      @module_dir = File.join(@react_native_root, 'modules/@shopify/checkout-kit-react-native')
      @module_readme = File.join(@module_dir, 'README.md')
      @root_readme = File.join(@react_native_root, 'README.md')
    end

    def pack(dry_run: false)
      Shell.require_command!('pnpm', 'pnpm is required to build and pack the workspace')
      Shell.require_command!('node', 'node is required')
      Shell.require_command!('tar', 'tar is required')

      Shell.section('Packing @shopify/checkout-kit-react-native')
      FileUtils.rm_rf(pack_dir)
      FileUtils.mkdir_p(pack_dir)
      Shell.detail("Pack directory: #{pack_dir}")

      with_module_readme do
        Shell.run('pnpm', 'module', 'clean', chdir: react_native_root)
        Shell.run('pnpm', 'module', 'build', chdir: react_native_root)
        Shell.run('pnpm', 'pack', '--dry-run', chdir: @module_dir) if dry_run
        Shell.run('pnpm', 'pack', '--pack-destination', pack_dir, chdir: @module_dir)
      end

      tarballs = Dir[File.join(pack_dir, '*.tgz')]
      raise "Expected exactly one tarball in #{pack_dir}, found #{tarballs.length}" unless tarballs.length == 1

      tarball = File.expand_path(tarballs.first)
      Shell.detail("Tarball: #{tarball}")
      tarball
    end

    private

    def with_module_readme
      backup = nil
      had_readme = File.exist?(@module_readme)

      begin
        backup = File.join(Dir.tmpdir, "checkout-kit-rn-readme.#{$PROCESS_ID}.#{rand(1_000_000)}")
        FileUtils.cp(@module_readme, backup) if had_readme
        FileUtils.cp(@root_readme, @module_readme)
        yield
      ensure
        if backup && File.exist?(backup)
          if had_readme
            FileUtils.cp(backup, @module_readme)
          else
            FileUtils.rm_f(@module_readme)
          end
          FileUtils.rm_f(backup)
        elsif !had_readme
          FileUtils.rm_f(@module_readme)
        end
      end
    end
  end
end
