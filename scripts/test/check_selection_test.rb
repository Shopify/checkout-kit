# frozen_string_literal: true

require "minitest/autorun"
require_relative "../lib/changed_file_filters"
require_relative "../lib/check_selection"

class CheckSelectionTest < Minitest::Test
  FILTER_FILE = File.expand_path("../../.ci/changed-file-filters.yml", __dir__)

  def setup
    @selection = CheckSelection.new(filters: ChangedFileFilters.load(FILTER_FILE))
  end

  def test_selects_all_checks_when_no_changed_files_are_supplied
    assert_equal CheckSelection::ALL_CHECKS, @selection.checks_for([])
  end

  def test_selects_web_checks_for_web_source_changes
    assert_equal [:web], @selection.checks_for(["platforms/web/src/checkout.ts"])
  end

  def test_selects_android_checks_for_android_and_kotlin_protocol_changes
    assert_equal [:android], @selection.checks_for(["platforms/android/lib/src/main/Checkout.kt"])
    assert_equal [:android], @selection.checks_for(["protocol/languages/kotlin/Models.kt"])
  end

  def test_selects_swift_checks_for_swift_protocol_and_package_changes
    assert_equal [:swift], @selection.checks_for(["protocol/languages/swift/Sources/Models.swift"])
    assert_equal [:swift], @selection.checks_for(["Package.swift"])
  end

  def test_selects_react_native_and_protocol_typescript_checks_for_typescript_protocol_changes
    assert_equal(
      [:react_native, :protocol_typescript],
      @selection.checks_for(["protocol/languages/typescript/src/client.ts"])
    )
  end

  def test_selects_all_generated_language_dependents_for_shared_protocol_tooling_changes
    assert_equal(
      [:android, :swift, :react_native, :protocol_typescript],
      @selection.checks_for(["protocol/scripts/generate_models.mjs"])
    )
  end

  def test_does_not_fan_out_native_sdk_changes_to_react_native
    assert_equal [:android], @selection.checks_for(["platforms/android/lib/src/main/Checkout.kt"])
    assert_equal [:swift], @selection.checks_for(["platforms/swift/Sources/Checkout.swift"])
  end

  def test_selects_script_and_e2e_validation_for_their_respective_changes
    assert_equal [:scripts], @selection.checks_for(["scripts/setup_storefront_env"])
    assert_equal [:scripts, :e2e], @selection.checks_for(["e2e/config/matrix.yml"])
  end

  def test_selects_all_checks_for_shared_ci_and_dev_configuration
    assert_equal CheckSelection::ALL_CHECKS, @selection.checks_for(["dev.yml"])
    assert_equal CheckSelection::ALL_CHECKS, @selection.checks_for([".ci/changed-file-filters.yml"])
  end
end
