# frozen_string_literal: true

require_relative 'shared'

module PublishChecks
  class NativeBuild
    def initialize(app_dir:, platform:, ios_configuration:, ios_destination:, android_gradle_task:)
      @app_dir = app_dir
      @platform = platform
      @ios_configuration = ios_configuration
      @ios_destination = ios_destination
      @android_gradle_task = android_gradle_task
    end

    def build
      case @platform
      when 'ios'
        build_ios
      when 'android'
        build_android
      else
        raise "PLATFORM must be ios or android, got #{@platform.inspect}"
      end
    end

    private

    def build_ios
      Shell.require_command!('xcodebuild', 'xcodebuild is required for PLATFORM=ios native builds')

      workspaces = Dir[File.join(@app_dir, 'ios/*.xcworkspace')]
      raise "Expected an iOS workspace under #{@app_dir}/ios" if workspaces.empty?

      workspace = workspaces.first
      scheme = ENV.fetch('IOS_SCHEME', File.basename(workspace, '.xcworkspace'))

      Shell.section('Compiling iOS app with xcodebuild')
      puts "Workspace: #{workspace}"
      puts "Scheme: #{scheme}"
      puts "Configuration: #{@ios_configuration}"
      puts "Destination: #{@ios_destination}"

      Shell.run(
        'xcodebuild', 'build',
        '-workspace', workspace,
        '-scheme', scheme,
        '-configuration', @ios_configuration,
        '-sdk', 'iphonesimulator',
        '-destination', @ios_destination,
        '-derivedDataPath', File.join(@app_dir, 'ios/build/DerivedData'),
        '-skipPackagePluginValidation',
        'CODE_SIGNING_ALLOWED=NO',
        'COMPILER_INDEX_STORE_ENABLE=NO',
        chdir: @app_dir,
        env: {'RCT_NO_LAUNCH_PACKAGER' => '1'}
      )
    end

    def build_android
      gradlew = File.join(@app_dir, 'android/gradlew')
      raise "Expected executable Android Gradle wrapper at #{gradlew}" unless File.executable?(gradlew)

      Shell.section('Compiling Android app with Gradle')
      puts "Task: #{@android_gradle_task}"
      Shell.run('./gradlew', @android_gradle_task, '--no-daemon', '--console=plain', chdir: File.join(@app_dir, 'android'))
    end
  end
end
