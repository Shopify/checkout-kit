# frozen_string_literal: true

require "minitest/autorun"
require "fileutils"
require "open3"
require "rbconfig"
require "tmpdir"

class SwiftApiInterfaceTest < Minitest::Test
  SCRIPT = File.expand_path("../../platforms/swift/Scripts/api", __dir__)
  MODULES = %w[EmbeddedCheckoutProtocol ShopifyCheckoutKit ShopifyAcceleratedCheckouts].freeze
  DECLARATIONS = <<~SWIFT
    // swift-interface-format-version: 1.0
    import Swift
    public struct Options {
      public var locale: Swift.String?
      public init(locale: Swift.String? = nil)
    }
    #if compiler(>=5.3) && $NoncopyableGenerics
    @inlinable public func identity<T>(_ value: T) -> T { value }
    #endif
  SWIFT

  def setup
    @root = Dir.mktmpdir("swift-api-test")
    @script_dir = File.join(@root, "platforms/swift/Scripts")
    @baselines = File.join(@root, "platforms/swift/api")
    FileUtils.mkdir_p(@script_dir)
    FileUtils.cp(SCRIPT, @script_dir)
    File.write(File.join(@root, "Package.swift"), "// Test package\n")
    @input = File.join(@root, "input.swiftinterface")
    write_interface
    bin = File.join(@root, "bin")
    FileUtils.mkdir_p(bin)
    write_executable(File.join(bin, "xcodebuild"), <<~'RUBY')
      require "fileutils"
      abort "Build failed" if ENV["SWIFT_API_TEST_BUILD_FAIL"] == "1"
      required = [
        "-disableAutomaticPackageResolution", "ARCHS=arm64",
        "BUILD_LIBRARY_FOR_DISTRIBUTION=YES", "SWIFT_TREAT_WARNINGS_AS_ERRORS=NO",
        "OTHER_SWIFT_FLAGS=$(inherited) -no-verify-emitted-module-interface"
      ]
      abort "Missing build options" unless (required - ARGV).empty?
      derived = ARGV.fetch(ARGV.index("-derivedDataPath") + 1)
      %w[EmbeddedCheckoutProtocol ShopifyCheckoutKit ShopifyAcceleratedCheckouts].each do |name|
        path = File.join(derived, "Build/Products/Debug-iphonesimulator", "#{name}.swiftmodule")
        FileUtils.mkdir_p(path)
        next if name == ENV["SWIFT_API_TEST_MISSING_MODULE"]
        FileUtils.cp(ENV.fetch("SWIFT_API_TEST_INPUT"), File.join(path, "arm64-apple-ios-simulator.swiftinterface"))
        %w[arm64-apple-ios-simulator.private arm64-apple-ios-simulator.package x86_64-apple-ios-simulator].each do |variant|
          File.write(File.join(path, "#{variant}.swiftinterface"), "must never enter the public baseline\n")
        end
      end
    RUBY
    File.write(File.join(bin, "xcbeautify"), "#!/bin/sh\ncat\n")
    FileUtils.chmod(0o755, File.join(bin, "xcbeautify"))
    @env = {"PATH" => "#{bin}:#{ENV.fetch('PATH')}", "SWIFT_API_TEST_INPUT" => @input}
  end

  def teardown
    FileUtils.remove_entry(@root)
  end

  def test_dump_records_only_public_interfaces_and_removes_only_build_metadata
    run_api("dump")
    assert_equal MODULES.map { |name| "#{name}.swiftinterface" }.sort, Dir.children(@baselines).sort
    snapshot.each_value { |content| assert_equal DECLARATIONS, content }
    before = snapshot

    write_interface(compiler: "Another compiler", flags: "-another-sdk /another/path")
    run_api("check")
    run_api("dump")
    assert_equal before, snapshot
  end

  def test_check_reports_additions_removals_and_signature_changes_without_updating_baselines
    run_api("dump")
    before = snapshot
    [
      DECLARATIONS + "public func added()\n",
      DECLARATIONS.sub("  public var locale: Swift.String?\n", ""),
      DECLARATIONS.sub("init(locale:", "init(language:")
    ].each do |changed|
      write_interface(declarations: changed)
      output = run_api("check", success: false)
      assert_includes output, "--- approved/EmbeddedCheckoutProtocol.swiftinterface"
      assert_includes output, "+++ proposed/EmbeddedCheckoutProtocol.swiftinterface"
      assert_includes output, "Public Swift API drift detected"
      assert_equal before, snapshot
    end
  end

  def test_check_preserves_attributes_guards_inline_bodies_and_declaration_order
    run_api("dump")
    [
      DECLARATIONS.sub("@inlinable ", ""),
      DECLARATIONS.sub("compiler(>=5.3)", "compiler(>=6.0)"),
      DECLARATIONS.sub("{ value }", "{ fatalError() }"),
      DECLARATIONS.sub(
        "  public var locale: Swift.String?\n  public init(locale: Swift.String? = nil)",
        "  public init(locale: Swift.String? = nil)\n  public var locale: Swift.String?"
      )
    ].each do |changed|
      write_interface(declarations: changed)
      assert_includes run_api("check", success: false), "Public Swift API drift detected"
    end
  end

  def test_check_rejects_missing_baselines_without_creating_them
    output = run_api("check", success: false)
    assert_includes output, "missing committed baseline"
    refute Dir.exist?(@baselines)
  end

  def test_missing_module_does_not_partially_update_baselines
    run_api("dump")
    before = snapshot
    write_interface(declarations: DECLARATIONS + "public func added()\n")
    @env["SWIFT_API_TEST_MISSING_MODULE"] = MODULES.last
    assert_includes run_api("dump", success: false), "no public .swiftinterface emitted"
    assert_equal before, snapshot
  end

  def test_build_failure_is_not_hidden_by_output_formatter
    run_api("dump")
    before = snapshot
    @env["SWIFT_API_TEST_BUILD_FAIL"] = "1"
    assert_includes run_api("dump", success: false), "Build failed"
    assert_equal before, snapshot
  end

  def test_diagnose_compares_baselines_without_building_and_succeeds_with_differences
    run_api("dump")
    git("init", "-q")
    git("add", ".")
    git("-c", "user.name=API Test", "-c", "user.email=api@example.com", "commit", "-qm", "Baseline")
    @env["SWIFT_API_TEST_BUILD_FAIL"] = "1"
    assert_includes run_api("diagnose", "HEAD"), "unchanged since HEAD"

    File.open(File.join(@baselines, "#{MODULES.last}.swiftinterface"), "a") { |file| file.puts("public func added()") }
    output = run_api("diagnose", "HEAD")
    assert_includes output, "+public func added()"
    assert_includes output, "--- HEAD/#{MODULES.last}.swiftinterface"
  end

  def test_diagnose_rejects_invalid_refs_and_reports_pre_migration_refs
    git("init", "-q")
    git("add", ".")
    git("-c", "user.name=API Test", "-c", "user.email=api@example.com", "commit", "-qm", "Before baselines")
    assert_includes run_api("diagnose", "HEAD"), "no .swiftinterface baseline at HEAD"
    run_api("diagnose", "does-not-exist", success: false)
  end

  private

  def write_interface(compiler: "Test compiler", flags: "-sdk /test-sdk", declarations: DECLARATIONS)
    File.write(@input, "// swift-compiler-version: #{compiler}\n" \
      "// swift-module-flags: #{flags}\n" \
      "// swift-module-flags-ignorable: -some-flag\n" + declarations)
  end

  def snapshot
    Dir.glob(File.join(@baselines, "*.swiftinterface")).to_h { |file| [file, File.read(file)] }
  end

  def write_executable(path, content)
    File.write(path, "#!#{RbConfig.ruby}\n" + content)
    FileUtils.chmod(0o755, path)
  end

  def run_api(*args, success: true)
    output, status = Open3.capture2e(@env, "bash", File.join(@script_dir, "api"), *args)
    assert_equal success, status.success?, output
    output
  end

  def git(*args)
    output, status = Open3.capture2e("git", "-c", "commit.gpgsign=false", "-C", @root, *args)
    assert status.success?, output
  end
end
