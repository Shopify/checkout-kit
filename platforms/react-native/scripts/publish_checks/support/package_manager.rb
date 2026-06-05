# frozen_string_literal: true

require 'digest'
require 'fileutils'

require_relative 'shared'

module PublishChecks
  class PackageManager
    attr_reader :name, :registry

    SUPPORTED = %w[pnpm npm yarn bun].freeze

    def initialize(name:, registry:)
      @name = name.to_s
      @registry = registry
      raise "Unsupported package manager '#{@name}'. Use one of: #{SUPPORTED.join(', ')}" unless SUPPORTED.include?(@name)
    end

    def binary
      case name
      when 'pnpm' then ENV.fetch('PNPM_BIN', 'pnpm')
      when 'npm' then ENV.fetch('NPM_BIN', 'npm')
      when 'yarn' then ENV.fetch('YARN_BIN', 'yarn')
      when 'bun' then ENV.fetch('BUN_BIN', 'bun')
      end
    end

    def ensure_available!
      Shell.require_command!(binary, "#{name} binary '#{binary}' was not found. Install it or set #{name.upcase}_BIN.")
    end

    def namespace
      @namespace ||= [name, sanitize(version || 'unknown'), binary_fingerprint].join('-')
    end

    def version
      @version ||= Shell.capture(binary, '--version').strip.lines.first&.strip
    rescue StandardError
      nil
    end

    def resolved_binary
      Shell.which(binary) || binary
    end

    def write_config(app_dir)
      FileUtils.mkdir_p(File.join(app_dir, '.home'))
      FileUtils.mkdir_p(File.join(app_dir, '.xdg'))

      File.write(File.join(app_dir, '.npmrc'), <<~NPMRC)
        node-linker=hoisted
        registry=#{registry}
        @shopify:registry=#{registry}
        ignore-scripts=true
        strict-peer-dependencies=false
        audit=false
        fund=false
      NPMRC

      File.write(File.join(app_dir, 'global-npmrc'), <<~NPMRC)
        registry=#{registry}
        @shopify:registry=#{registry}
        audit=false
        fund=false
      NPMRC

      File.write(File.join(app_dir, '.yarnrc'), <<~YARNRC)
        registry "#{registry}"
        "@shopify:registry" "#{registry}"
      YARNRC
    end

    def install(app_dir)
      ensure_available!
      Shell.section("Installing generated app dependencies with #{name}")
      Shell.detail("Binary: #{resolved_binary}")

      case name
      when 'pnpm'
        run_in_app(app_dir, binary, 'install', '--ignore-scripts')
      when 'npm'
        run_in_app(app_dir, binary, 'install', '--ignore-scripts', '--no-audit', '--no-fund', '--registry', registry)
      when 'yarn'
        run_in_app(app_dir, binary, 'install', '--ignore-scripts', '--non-interactive', '--registry', registry)
      when 'bun'
        run_in_app(app_dir, binary, 'install', '--ignore-scripts', '--registry', registry)
      end
    end

    def add(app_dir, package_spec)
      ensure_available!
      Shell.section("Installing package with #{name}")
      Shell.detail("Package: #{package_spec}")

      case name
      when 'pnpm'
        run_in_app(app_dir, binary, 'add', package_spec, '--ignore-scripts')
      when 'npm'
        run_in_app(app_dir, binary, 'install', package_spec, '--ignore-scripts', '--no-audit', '--no-fund', '--registry', registry)
      when 'yarn'
        run_in_app(app_dir, binary, 'add', package_spec, '--ignore-scripts', '--non-interactive', '--registry', registry)
      when 'bun'
        run_in_app(app_dir, binary, 'add', package_spec, '--ignore-scripts', '--registry', registry)
      end
    end

    def run_script(app_dir, script)
      case name
      when 'pnpm'
        run_in_app(app_dir, binary, script)
      when 'npm'
        run_in_app(app_dir, binary, 'run', script)
      when 'yarn'
        run_in_app(app_dir, binary, script)
      when 'bun'
        run_in_app(app_dir, binary, 'run', script)
      end
    end

    def exec(app_dir, *command)
      case name
      when 'pnpm'
        run_in_app(app_dir, binary, 'exec', *command)
      when 'npm'
        run_in_app(app_dir, binary, 'exec', '--', *command)
      when 'yarn'
        run_in_app(app_dir, binary, *command)
      when 'bun'
        run_in_app(app_dir, ENV.fetch('BUNX_BIN', 'bunx'), *command)
      end
    end

    def isolated_env(app_dir)
      {
        'HOME' => File.join(app_dir, '.home'),
        'XDG_CONFIG_HOME' => File.join(app_dir, '.xdg'),
        'NPM_CONFIG_USERCONFIG' => File.join(app_dir, '.npmrc'),
        'NPM_CONFIG_GLOBALCONFIG' => File.join(app_dir, 'global-npmrc'),
        'NPM_CONFIG_REGISTRY' => registry,
        'NPM_CONFIG_IGNORE_SCRIPTS' => 'true',
        'NPM_CONFIG_AUDIT' => 'false',
        'NPM_CONFIG_FUND' => 'false',
        'npm_config_registry' => nil,
        'npm_config_userconfig' => nil,
        'npm_config_globalconfig' => nil,
        'YARN_REGISTRY' => nil,
        'BUN_CONFIG_REGISTRY' => nil
      }
    end

    private

    def run_in_app(app_dir, *command)
      Shell.run(*command, chdir: app_dir, env: isolated_env(app_dir))
    end

    def binary_fingerprint
      Digest::SHA256.hexdigest(resolved_binary)[0, 8]
    end

    def sanitize(value)
      value.to_s.gsub(/[^A-Za-z0-9._-]+/, '-').gsub(/\A-+|-+\z/, '')
    end
  end
end
