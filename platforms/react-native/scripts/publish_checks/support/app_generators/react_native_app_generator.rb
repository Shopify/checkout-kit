# frozen_string_literal: true

require_relative '../npm_binary'
require_relative '../shared'

module PublishChecks
  class ReactNativeAppGenerator
    APP_NAME = 'CheckoutKitRnSmokeApp'
    PACKAGE_NAME = 'com.shopify.checkoutkitrnsmoke'

    def initialize(version:, template:, registry:)
      @version = version
      @template = template
      @registry = registry
    end

    def generate(app_dir)
      Shell.section('Creating a fresh React Native app with React Native CLI')
      puts "App dir: #{app_dir}"
      puts "React Native version: #{@version || '(CLI default)'}"
      puts "Template: #{@template || '(React Native default)'}"

      npm = NpmBinary.find_unwrapped(override: ENV['CREATE_REACT_NATIVE_APP_NPM_BIN'])
      raise 'React Native CLI needs npm to fetch templates, but no npm binary was found. Install npm or set CREATE_REACT_NATIVE_APP_NPM_BIN=/path/to/npm.' unless npm

      puts "React Native CLI npm binary: #{npm}"
      command = [
        'pnpm', 'dlx', ENV.fetch('REACT_NATIVE_CLI_PACKAGE', '@react-native-community/cli@latest'),
        'init', APP_NAME,
        '--directory', app_dir,
        '--skip-install',
        '--skip-git-init',
        '--install-pods', 'false',
        '--package-name', PACKAGE_NAME,
        '--pm', 'npm'
      ]
      command.concat(['--version', @version]) if @version && !@version.empty?
      command.concat(['--template', @template]) if @template && !@template.empty?

      env = {
        'PATH' => "#{File.dirname(npm)}#{File::PATH_SEPARATOR}#{ENV.fetch('PATH', '')}",
        'npm_config_registry' => @registry,
        'NPM_CONFIG_REGISTRY' => @registry
      }

      Shell.run(*command, env: env)
    end
  end
end
