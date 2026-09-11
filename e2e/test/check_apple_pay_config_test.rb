# frozen_string_literal: true

require "minitest/autorun"
require "open3"
require "tempfile"

class CheckApplePayConfigTest < Minitest::Test
  REPO_ROOT = File.expand_path("../..", __dir__)
  SCRIPT = File.join(REPO_ROOT, "e2e", "scripts", "check_apple_pay_config")
  SYNTHETIC_IDENTIFIER = "merchant.com.example.e2e"

  def test_missing_or_blank_assignment_fails_without_printing_a_value
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

  private

  def with_config(contents)
    Tempfile.create(["apple-pay", ".xcconfig"]) do |file|
      file.write(contents)
      file.flush
      yield file.path
    end
  end
end
