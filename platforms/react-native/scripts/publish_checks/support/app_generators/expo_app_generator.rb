# frozen_string_literal: true

require_relative '../npm_binary'
require_relative '../shared'

module PublishChecks
  class ExpoAppGenerator
    def initialize(template:, registry:)
      @template = template
      @registry = registry
    end

    def generate(app_dir)
      Shell.section('Creating a fresh Expo app with Expo CLI')
      puts "App dir: #{app_dir}"
      puts "Template: #{@template}"

      npm = NpmBinary.find_unwrapped(override: ENV['CREATE_EXPO_APP_NPM_BIN'])
      raise 'create-expo-app needs npm to fetch templates, but no npm binary was found. Install npm or set CREATE_EXPO_APP_NPM_BIN=/path/to/npm.' unless npm

      puts "create-expo-app npm binary: #{npm}"
      env = {
        'PATH' => "#{File.dirname(npm)}#{File::PATH_SEPARATOR}#{ENV.fetch('PATH', '')}",
        'npm_config_registry' => @registry,
        'NPM_CONFIG_REGISTRY' => @registry
      }

      Shell.run(
        'pnpm', 'dlx', 'create-expo-app@latest', app_dir,
        '--template', @template,
        '--no-install',
        '--no-agents-md',
        env: env
      )
    end
  end
end
