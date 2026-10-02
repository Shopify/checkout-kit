# frozen_string_literal: true

require "minitest/autorun"
require "fileutils"
require "open3"
require "tmpdir"

class ReleaseProtocolDependencyTest < Minitest::Test
  VALIDATOR = File.expand_path("../../.github/scripts/validate-release-version", __dir__)

  def test_protocol_can_release_before_kit_adopts_it
    Dir.mktmpdir("protocol-release") do |root|
      catalog_dir = File.join(root, "platforms/android/gradle")
      FileUtils.mkdir_p(catalog_dir)
      File.write(File.join(catalog_dir, "libs.versions.toml"), <<~TOML)
        [versions]
        checkoutKitAndroid = "4.0.0"
        embeddedCheckoutProtocolAndroidRelease = "2026.09.28.1"
        embeddedCheckoutProtocolAndroid = "2026.08.25.1"
      TOML

      android, error, status = Open3.capture3(VALIDATOR, "Android", chdir: root)
      assert status.success?, error
      assert_includes android.lines, "android_protocol_version=2026.08.25.1\n"

      protocol, error, status = Open3.capture3(VALIDATOR, "Embedded Checkout Protocol", chdir: root)
      assert status.success?, error
      assert_includes protocol.lines, "version=2026.09.28.1\n"
      assert_includes protocol.lines, "tag=embedded-checkout-protocol/2026.09.28.1\n"
    end
  end
end
