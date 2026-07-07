# frozen_string_literal: true

require "minitest/autorun"
require_relative "../lib/changed_file_filters"

class ChangedFileFiltersTest < Minitest::Test
  FILTER_FILE = File.expand_path("../../.ci/changed-file-filters.yml", __dir__)

  def setup
    @filters = ChangedFileFilters.load(FILTER_FILE)
  end

  def test_matches_file_inside_platform_directory
    assert @filters.match?("android", ["platforms/android/src/Checkout.kt"])
    assert @filters.match?("reactNative", ["platforms/react-native/src/index.ts"])
  end

  def test_scopes_protocol_typescript_to_its_own_subtree
    assert @filters.match?("protocolTypescript", ["protocol/languages/typescript/models.ts"])
    refute @filters.match?("protocolTypescript", ["protocol/languages/kotlin/Models.kt"])
  end

  def test_excludes_markdown_at_top_level_and_nested
    refute @filters.match?("android", ["platforms/android/README.md"])
    refute @filters.match?("web", ["platforms/web/guides/nested/CHANGELOG.md"])
  end

  def test_excludes_docs_directory_single_level
    refute @filters.match?("e2e", ["e2e/docs/notes.txt"])
    refute @filters.match?("reactNative", ["platforms/react-native/docs/screenshot.png"])
  end

  def test_excludes_docs_directory_nested
    refute @filters.match?("web", ["platforms/web/docs/assets/deep/logo.png"])
    refute @filters.match?("android", ["platforms/android/docs/api/v2/reference.json"])
  end

  def test_includes_non_docs_non_markdown_file
    assert @filters.match?("web", ["platforms/web/src/component.ts"])
    assert @filters.match?("e2e", ["e2e/config/matrix.yml"])
  end

  def test_negation_excludes_file_matching_positive_and_negative
    refute @filters.match?("swift", ["platforms/swift/docs/index.md"])
    assert @filters.match?("swift", ["platforms/swift/Sources/Checkout.swift"])
  end

  def test_matches_when_any_named_filter_matches
    assert @filters.match?(["android", "web"], ["platforms/web/src/app.ts"])
    refute @filters.match?(["android", "web"], ["platforms/swift/Sources/Checkout.swift"])
  end

  def test_empty_changed_files_never_matches
    refute @filters.match?("reactNative", [])
    refute @filters.match?("ciFilters", [])
  end

  def test_matches_literal_filters
    assert @filters.match?("packageSwift", ["Package.swift"])
    assert @filters.match?("packageSwift", ["Package.resolved"])
    refute @filters.match?("packageSwift", ["platforms/swift/Package.swift"])
    assert @filters.match?("ciFilters", [".ci/changed-file-filters.yml"])
    refute @filters.match?("ciFilters", [".ci/other.yml"])
  end

  def test_matching_filters_returns_touched_group_names
    names = @filters.matching_filters(["platforms/android/src/Checkout.kt"])

    assert_includes names, "android"
    refute_includes names, "web"
    refute_includes names, "reactNative"
  end

  def test_unknown_filter_name_raises_key_error
    assert_raises(KeyError) { @filters.match?("unknownFilter", ["platforms/web/src/app.ts"]) }
  end

  def test_validation_errors_flags_non_hash_map
    errors = ChangedFileFilters.new([]).validation_errors

    assert_includes errors, "changed file filters must be a map"
  end

  def test_validation_errors_flags_empty_patterns_array
    errors = ChangedFileFilters.new({"web" => []}).validation_errors

    assert_includes errors, "changed file filter web must be a non-empty array"
  end

  def test_validation_errors_flags_empty_string_pattern
    errors = ChangedFileFilters.new({"web" => [""]}).validation_errors

    assert_includes errors, "changed file filter web patterns must be non-empty strings"
  end

  def test_real_filter_file_has_no_validation_errors
    assert_empty @filters.validation_errors
  end

  def test_validation_errors_flags_brace_expansion_pattern
    errors = ChangedFileFilters.new({"web" => ["platforms/web/**/*.{ts,tsx}"]}).validation_errors

    assert_includes errors, "changed file filter web pattern platforms/web/**/*.{ts,tsx} uses unsupported glob syntax"
  end

  def test_validation_errors_flags_character_class_pattern
    errors = ChangedFileFilters.new({"web" => ["platforms/web/v[0-9]/**"]}).validation_errors

    assert_includes errors, "changed file filter web pattern platforms/web/v[0-9]/** uses unsupported glob syntax"
  end
end
