# frozen_string_literal: true

require "minitest/autorun"

class MaestroVersionTest < Minitest::Test
  E2E_ROOT = File.expand_path("..", __dir__)
  VERSION_FILE = File.join(E2E_ROOT, ".maestro-version")

  # One file holds the version, so the local CLI and the BrowserStack run cannot drift apart.
  # They did drift: a local 1.x passed every iOS test against a simulator while CI failed
  # every one of them against a real device.
  #
  # BrowserStack builds the suite with its own Maestro, and it offers these versions only.
  # Maestro itself ships far newer releases, so BrowserStack sets the ceiling on the pin.
  # https://www.browserstack.com/docs/app-automate/maestro/set-up-test-env/configure-tests/set-maestro-version
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

  def test_browserstack_offers_the_pinned_version
    assert_includes(
      BROWSERSTACK_VERSIONS,
      pinned_version,
      "BrowserStack rejects every other version, so CI would not run this pin"
    )
  end

  def test_the_pinned_version_carries_ios_open_link
    assert_operator(
      Gem::Version.new(pinned_version),
      :>=,
      Gem::Version.new(IOS_OPEN_LINK_VERSION),
      "iOS tests that open the control link fail on a real device below #{IOS_OPEN_LINK_VERSION}"
    )
  end
end
