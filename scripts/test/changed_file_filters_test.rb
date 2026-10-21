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

  def test_matches_platform_and_telemetry_paths_independently
    {
      "web" => [
        "platforms/web/components/shopify-checkout/src/shopify-checkout.ts",
        "platforms/web/internal/telemetry/src/types.ts",
        "platforms/shared/telemetry/contract/schema.json"
      ],
      "swift" => [
        "platforms/swift/Sources/Checkout.swift",
        "platforms/swift/Sources/Internal/Telemetry.swift"
      ]
    }.each do |name, paths|
      paths.each { |path| assert @filters.match?(name, [path]), "#{name} should match #{path}" }
      refute @filters.match?(name, ["platforms/android/src/Checkout.kt"])
    end
    refute @filters.match?("web", ["platforms/web/internal/telemetry/README.md"])
    refute @filters.match?("swift", ["platforms/swift/Sources/Internal/Telemetry/docs/example.swift"])
  end

  # Exercise the actual workflow outputs as well as the globs: correct filters
  # are insufficient when the expressions that combine them select the wrong jobs.
  def github_areas(paths)
    workflow = YAML.safe_load_file(File.expand_path("../../.github/workflows/ci.yml", __dir__), aliases: true)
    changes = workflow.fetch("jobs").fetch("changes")
    infra = changes.fetch("steps").find { |step| step["id"] == "infra" }
    filters = {
      "platform" => @filters,
      "infra" => ChangedFileFilters.new(YAML.safe_load(infra.fetch("with").fetch("filters")))
    }
    changes.fetch("outputs").filter_map do |name, expression|
      terms = expression.delete_prefix("${{ ").delete_suffix(" }}").split(" || ")
      selected = terms.map do |term|
        match = /\Asteps\.(platform|infra)\.outputs\.(\w+) == 'true'\z/.match(term)
        raise "Unsupported routing expression: #{term}" unless match

        filters.fetch(match[1]).match?(match[2], paths)
      end
      name if selected.any?
    end
  end

  def test_root_podspec_selects_swift_validation
    assert_equal ["swift"], github_areas(["ShopifyCheckoutKit.podspec"])
  end

  def test_android_telemetry_sources_and_tests_select_android_and_telemetry
    paths = [
      "platforms/android/shopify-checkout/src/main/java/com/shopify/checkoutkit/internal/telemetry/CheckoutKitTelemetry.kt",
      "platforms/android/shopify-checkout/src/test/java/com/shopify/checkoutkit/checkout/telemetry/CheckoutKitTelemetryTest.kt"
    ]
    paths.each do |path|
      assert File.file?(File.expand_path("../../#{path}", __dir__)), "Test the current source layout: #{path}"
      assert_equal ["android", "telemetry"], github_areas([path])
    end
  end

  def test_android_rn_infrastructure_keeps_common_and_android_validation
    %w[rn-build-android rn-test-android].each do |workflow|
      assert_equal ["reactNative", "reactNativeAndroid"], github_areas([".github/workflows/#{workflow}.yml"])
    end
  end

  def test_common_rn_infrastructure_selects_all_rn_jobs
    assert_equal ["reactNative", "reactNativeAndroid", "reactNativeSwift"], github_areas([".github/workflows/rn-lint.yml"])
  end

  def test_rn_component_changes_select_js_and_android_rn_jobs
    [
      "platforms/react-native/components/shopify-checkout/src/index.ts",
      "platforms/react-native/components/new-component/src/index.ts"
    ].each do |path|
      assert_equal ["reactNative", "reactNativeAndroid"], github_areas([path])
    end
  end

  def test_ios_only_rn_changes_skip_android_rn_jobs
    [
      "platforms/react-native/ios/ShopifyCheckoutKit.swift",
      "platforms/react-native/sample/ios/Podfile.lock",
      "platforms/react-native/test/rct-integration-app/RCTIntegrationApp/AppDelegate.swift",
      "platforms/react-native/RNShopifyCheckoutKit.podspec"
    ].each do |path|
      areas = github_areas([path])
      assert_includes areas, "reactNative", path
      refute_includes areas, "reactNativeAndroid", path
    end
  end

  def test_android_and_shared_rn_changes_select_android_rn_jobs
    [
      "platforms/react-native/android/build.gradle",
      "platforms/react-native/sample/android/app/build.gradle",
      "platforms/react-native/src/index.ts",
      "platforms/react-native/pnpm-lock.yaml"
    ].each do |path|
      assert_equal ["reactNative", "reactNativeAndroid"], github_areas([path]), path
    end
  end

  def test_only_rn_swift_inputs_select_rn_swift_lint
    [
      "platforms/react-native/ios/ShopifyCheckoutKit.swift",
      "platforms/react-native/test/rct-integration-app/RCTIntegrationApp/AppDelegate.swift",
      "platforms/react-native/.swiftlint.yml"
    ].each do |path|
      assert_includes github_areas([path]), "reactNativeSwift", path
    end
    [
      "platforms/react-native/src/index.ts",
      "platforms/react-native/android/build.gradle",
      "protocols/universal-commerce-protocol/embedded-checkout-protocol/languages/typescript/models.ts"
    ].each do |path|
      refute_includes github_areas([path]), "reactNativeSwift", path
    end
  end

  def test_protocol_changes_select_their_consumers
    root = "protocols/universal-commerce-protocol/embedded-checkout-protocol"
    assert_equal ["android", "protocol"], github_areas(["#{root}/languages/kotlin/Models.kt"])
    assert_equal ["swift", "protocol"], github_areas(["#{root}/languages/swift/Models.swift"])
    assert_equal ["reactNative", "reactNativeAndroid", "web", "protocol"],
      github_areas(["#{root}/languages/typescript/models.ts"])
    assert_equal ["android", "swift", "reactNative", "reactNativeAndroid", "web", "protocol"],
      github_areas(["#{root}/scripts/generate_models.sh"])
  end

  def test_docs_only_changes_select_no_platform_jobs
    assert_empty github_areas(["README.md", "platforms/web/README.md", "platforms/android/docs/notes.txt"])
  end

  def test_github_actions_share_the_ruby_inclusion_and_exclusion_semantics
    workflows = Dir.glob(File.expand_path("../../.github/workflows/*.yml", __dir__))
    shared_filter_steps = workflows.flat_map do |path|
      workflow = YAML.safe_load_file(path, aliases: true)
      workflow.fetch("jobs", {}).values.flat_map { |job| job.fetch("steps", []) }.filter_map do |step|
        next unless step.fetch("uses", "").start_with?("dorny/paths-filter@")
        next unless step.dig("with", "filters") == ".ci/changed-file-filters.yml"

        [path, step]
      end
    end

    refute_empty shared_filter_steps
    shared_filter_steps.each do |path, step|
      assert_equal "some-with-excludes", step.dig("with", "predicate-quantifier"),
        "#{path}: shared filters must match any inclusion while honoring all exclusions"
    end
  end

  def test_scopes_protocol_typescript_to_its_own_subtree
    assert @filters.match?("protocolTypescript", ["protocols/universal-commerce-protocol/embedded-checkout-protocol/languages/typescript/models.ts"])
    refute @filters.match?("protocolTypescript", ["protocols/universal-commerce-protocol/embedded-checkout-protocol/languages/kotlin/Models.kt"])
  end

  def test_matches_shared_protocol_inputs_and_generation_tooling
    assert @filters.match?("protocolShared", ["protocols/universal-commerce-protocol/embedded-checkout-protocol/schemas/ucp.json"])
    assert @filters.match?("protocolShared", ["protocols/universal-commerce-protocol/embedded-checkout-protocol/package.json"])
    assert @filters.match?("protocolShared", ["protocols/universal-commerce-protocol/embedded-checkout-protocol/scripts/codegen_tools.mjs"])
    refute @filters.match?("protocolShared", ["protocols/universal-commerce-protocol/embedded-checkout-protocol/languages/typescript/models.ts"])
    refute @filters.match?("protocolTypescript", ["protocols/universal-commerce-protocol/embedded-checkout-protocol/package.json"])
  end

  def test_web_browser_tests_trigger_web_without_triggering_native_e2e
    paths = ["platforms/web/test/e2e/tests/checkout.spec.ts"]
    assert @filters.match?("web", paths)
    refute @filters.match?("e2e", paths)
    refute @filters.match?("web", ["platforms/web/test/e2e/README.md"])
    assert @filters.match?("e2e", ["e2e/tests/shared/checkout-guest.yaml"])
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
