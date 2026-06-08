# frozen_string_literal: true

require 'json'

require_relative 'shared'

module PublishChecks
  class PackedTarball
    PACKAGE_NAME = '@shopify/checkout-kit-react-native'
    PROTOCOL_PACKAGE = '@shopify/checkout-kit-protocol'
    DEPENDENCY_SECTIONS = %w[dependencies devDependencies peerDependencies optionalDependencies].freeze
    LOCAL_SPEC_PATTERN = /\A(workspace|file|link|portal):/

    attr_reader :path, :contents, :manifest

    def initialize(path)
      @path = File.expand_path(path)
      @contents = Shell.capture('tar', '-tzf', @path).split("\n").sort
      @manifest = JSON.parse(Shell.capture('tar', '-xOf', @path, 'package/package.json'))
    end

    def print_contents
      Shell.section('Tarball contents')
      puts contents
    end

    def print_packed_manifest_summary
      Shell.section('Packed package manifest dependency summary')
      puts JSON.pretty_generate(manifest_summary(manifest, include_optional: true))
    end

    def validate_manifest!
      Shell.section('Checking packed manifest for local/workspace dependency specs')

      local_dependencies = dependency_entries.select do |entry|
        entry[:version].is_a?(String) && entry[:version].match?(LOCAL_SPEC_PATTERN)
      end
      unless local_dependencies.empty?
        formatted = local_dependencies.map { |entry| "#{entry[:section]}.#{entry[:name]}=#{entry[:version]}" }.join(', ')
        raise "Packed package still contains local/workspace dependencies: #{formatted}"
      end

      protocol_dependencies = dependency_entries.select { |entry| entry[:name] == PROTOCOL_PACKAGE }
      if protocol_dependencies.any? && !bundled_dependencies.include?(PROTOCOL_PACKAGE)
        formatted = protocol_dependencies.map { |entry| "#{entry[:section]}.#{entry[:name]}=#{entry[:version]}" }.join(', ')
        raise "Packed package references unpublished #{PROTOCOL_PACKAGE} but does not bundle it: #{formatted}"
      end

      puts 'Packed package manifest has no workspace:, file:, link:, or portal: dependency specs.'
      if protocol_dependencies.any?
        puts "Packed package references #{PROTOCOL_PACKAGE} and marks it as a bundled dependency."
      else
        puts "Packed package does not depend on #{PROTOCOL_PACKAGE}."
      end

      if contents.include?("package/node_modules/#{PROTOCOL_PACKAGE}/package.json")
        puts "Tarball includes bundled #{PROTOCOL_PACKAGE} package contents."
      elsif protocol_dependencies.any?
        raise "Packed manifest references #{PROTOCOL_PACKAGE}, but the tarball does not include it under package/node_modules."
      end
    end

    def references_protocol_package?
      dependency_entries.any? { |entry| entry[:name] == PROTOCOL_PACKAGE }
    end

    def manifest_summary(pkg, include_optional: false)
      summary = {
        name: pkg['name'],
        version: pkg['version'],
        dependencies: pkg['dependencies'],
        devDependencies: pkg['devDependencies'],
        peerDependencies: pkg['peerDependencies'],
        bundledDependencies: pkg['bundledDependencies'] || pkg['bundleDependencies']
      }
      summary[:optionalDependencies] = pkg['optionalDependencies'] if include_optional && pkg.key?('optionalDependencies')
      summary.compact
    end

    private

    def dependency_entries
      @dependency_entries ||= DEPENDENCY_SECTIONS.flat_map do |section|
        (manifest[section] || {}).map do |name, version|
          {section: section, name: name, version: version}
        end
      end
    end

    def bundled_dependencies
      @bundled_dependencies ||= Array(manifest['bundledDependencies']) + Array(manifest['bundleDependencies'])
    end
  end
end
