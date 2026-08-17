# frozen_string_literal: true

require "minitest/autorun"
require "open3"
require "tempfile"

class CheckSwiftApplePayConfigTest < Minitest::Test
  REPO_ROOT = File.expand_path("../..", __dir__)
  SCRIPT = File.join(REPO_ROOT, "e2e", "scripts", "check_swift_apple_pay_config")
  BUILD_SCRIPT = File.join(REPO_ROOT, "e2e", "scripts", "build_swift_ios")
  SYNTHETIC_IDENTIFIER = "merchant.com.example.e2e"

  def test_script_is_executable_bash
    assert File.executable?(SCRIPT)

    _output, error, status = Open3.capture3("bash", "-n", SCRIPT)

    assert status.success?, error
  end

  def test_missing_config_fails_without_printing_a_value
    Tempfile.create("missing-swift-storefront") do |file|
      path = file.path
      file.close
      File.unlink(path)

      output, error, status = Open3.capture3(SCRIPT, path)

      refute status.success?
      assert_empty output
      assert_includes error, "APPLE_PAY_MERCHANT_IDENTIFIER"
      refute_includes error, SYNTHETIC_IDENTIFIER
    end
  end

  def test_missing_or_blank_assignment_fails
    [
      "STOREFRONT_DOMAIN = example.invalid\n",
      "APPLE_PAY_MERCHANT_IDENTIFIER =   \n"
    ].each do |contents|
      with_config(contents) do |path|
        output, error, status = Open3.capture3(SCRIPT, path)

        refute status.success?
        assert_empty output
        assert_includes error, "nonblank APPLE_PAY_MERCHANT_IDENTIFIER"
        refute_includes error, SYNTHETIC_IDENTIFIER
      end
    end
  end

  def test_nonblank_assignment_succeeds_without_printing_the_value
    with_config("APPLE_PAY_MERCHANT_IDENTIFIER = #{SYNTHETIC_IDENTIFIER}\n") do |path|
      output, error, status = Open3.capture3(SCRIPT, path)

      assert status.success?, error
      assert_empty output
      assert_empty error
      refute_includes "#{output}#{error}", SYNTHETIC_IDENTIFIER
    end
  end

  def test_bitrise_swift_build_checks_config_after_generating_it
    script = File.read(BUILD_SCRIPT)
    configure_index = script.index("e2e_configure_storefront")
    check_index = script.index('"$script_dir/check_swift_apple_pay_config"')
    xcodegen_index = script.index("platforms/swift/Scripts/generate_xcode_projects")

    refute_nil configure_index
    refute_nil check_index
    refute_nil xcodegen_index
    assert_operator configure_index, :<, check_index
    assert_operator check_index, :<, xcodegen_index
  end

  private

  def with_config(contents)
    Tempfile.create(["swift-storefront", ".xcconfig"]) do |file|
      file.write(contents)
      file.flush
      yield file.path
    end
  end
end
