# frozen_string_literal: true

require "minitest/autorun"

class MaestroVersionTest < Minitest::Test
  E2E_ROOT = File.expand_path("..", __dir__)
  VERSION_FILE = File.join(E2E_ROOT, ".maestro-version")
  BROWSERSTACK_VERSION_FILE = File.join(E2E_ROOT, ".browserstack-maestro-version")
  BROWSERSTACK_VERSIONS = ["1.39.13", "2.0.7", "2.4.0"].freeze

  # Maestro added iOS openLink in 2.0.7. Every earlier release runs it through
  # `xcrun simctl openurl`, which accepts a simulator only, so a real device answers
  # "Invalid device" and every test that opens the control link fails one second after launch.
  IOS_OPEN_LINK_VERSION = "2.0.7"

  def pinned_version
    File.read(VERSION_FILE).strip
  end

  def test_the_pin_names_exactly_one_version
    assert_match(
      /\A\d+\.\d+\.\d+\z/,
      pinned_version,
      "#{VERSION_FILE} must hold one bare version, because every reader passes it verbatim"
    )
  end

  def test_browserstack_offers_its_pinned_version
    assert_includes(
      BROWSERSTACK_VERSIONS,
      File.read(BROWSERSTACK_VERSION_FILE).strip,
      "The optional BrowserStack pipeline must use a supported Maestro version"
    )
  end

  def test_the_pinned_versions_carry_ios_open_link
    [VERSION_FILE, BROWSERSTACK_VERSION_FILE].each do |version_file|
      assert_operator(
        Gem::Version.new(File.read(version_file).strip),
        :>=,
        Gem::Version.new(IOS_OPEN_LINK_VERSION),
        "#{version_file} must support iOS openLink from #{IOS_OPEN_LINK_VERSION}"
      )
    end
  end
end
