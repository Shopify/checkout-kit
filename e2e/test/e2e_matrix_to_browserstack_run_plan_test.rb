# frozen_string_literal: true

require "minitest/autorun"
require_relative "../lib/e2e_matrix_to_browserstack_run_plan"

class E2EMatrixToBrowserStackRunPlanTest < Minitest::Test
  MATRIX_PATH = File.expand_path("../config/matrix.yml", __dir__)

  def plan(changed_files: nil, config: base_config)
    E2EMatrixToBrowserStackRunPlan.new(MATRIX_PATH, config, changed_files: changed_files)
  end

  def base_config
    YAML.safe_load_file(MATRIX_PATH, aliases: true)
  end

  def selected_ids(changed_files)
    plan(changed_files: changed_files).selected_applications.map { |application| application.fetch("id") }
  end

  def run_for(application_id, changed_files: nil)
    plan(changed_files: changed_files).expand.find { |run| run.fetch("application_id") == application_id }
  end

  def test_expand_produces_one_run_per_application_and_os_version_tag
    runs = plan.expand

    assert_equal 8, runs.length
    assert_equal(
      [
        "react-native-ios-latest",
        "react-native-ios-previous",
        "react-native-android-latest",
        "react-native-android-previous",
        "kotlin-android-latest",
        "kotlin-android-previous",
        "swift-ios-latest",
        "swift-ios-previous"
      ],
      runs.map { |run| run.fetch("id") }
    )
  end

  # config.yaml declares `flows: tests/**/*.yaml`, and Maestro resolves that glob relative to
  # the path it is given. Executing "tests" would look for tests/tests/**, matching nothing.
  def test_a_run_executes_the_workspace_root_so_the_config_glob_resolves
    assert_equal ".", run_for("swift-ios").fetch("execute")
  end

  def test_runs_carry_default_tags_and_the_other_platform_exclusion
    ios_run = run_for("swift-ios")
    android_run = run_for("kotlin-android")

    assert_equal ["launch", "checkout"], ios_run.fetch("include_tags")
    assert_equal ["flaky", "wip", "android-only"], ios_run.fetch("exclude_tags")
    assert_equal ["flaky", "wip", "ios-only"], android_run.fetch("exclude_tags")
  end

  def test_an_application_overrides_the_default_tags
    config = base_config
    config.fetch("applications").first["include_tags"] = ["launch", "checkout"]
    config.fetch("applications").first["exclude_tags"] = ["wip", "android-only"]

    run = plan(config: config).expand.first

    assert_equal ["launch", "checkout"], run.fetch("include_tags")
    assert_equal ["wip", "android-only"], run.fetch("exclude_tags")
  end

  def test_validation_errors_flag_a_tag_in_both_effective_lists
    config = base_config
    config.fetch("applications").first["include_tags"] = ["launch", "android-only"]

    errors = plan(config: config).validation_errors

    assert_includes errors, "application react-native-ios includes and excludes [\"android-only\"]"
  end

  def test_a_control_link_follows_the_app_id_on_every_application
    plan.expand.each do |run|
      assert_equal "#{run.fetch("app_id")}://e2e", run.fetch("control_link")
    end
  end

  def test_a_status_context_no_longer_names_a_suite
    assert_equal "checkout-kit/e2e/swift-ios/latest", run_for("swift-ios").fetch("status_context")
  end

  def test_validation_errors_flags_an_include_tag_no_test_carries
    config = base_config
    config.fetch("tags")["include"] = ["launch", "teleport"]

    errors = plan(config: config).validation_errors

    assert_includes errors, "tags include 'teleport' but no test in tests/ carries it"
  end

  def test_validation_errors_flags_an_application_include_tag_no_test_carries
    config = base_config
    config.fetch("applications").first["include_tags"] = ["teleport"]

    errors = plan(config: config).validation_errors

    assert_includes errors, "application react-native-ios include_tags 'teleport' but no test in tests/ carries it"
  end

  def test_validation_errors_flags_non_array_include_tags
    config = base_config
    config.fetch("applications").first["include_tags"] = "launch"

    errors = plan(config: config).validation_errors

    assert_includes errors, "application react-native-ios include_tags must be an array"
  end

  def test_validation_errors_flags_a_missing_tests_path
    config = base_config
    config["tests_path"] = "does-not-exist"

    errors = plan(config: config).validation_errors

    assert_includes errors, "tests_path is not a directory: does-not-exist"
  end

  def test_nil_changed_files_selects_all_applications
    assert_equal ["react-native-ios", "react-native-android", "kotlin-android", "swift-ios"], selected_ids(nil)
  end

  def test_empty_changed_files_selects_no_applications
    assert_empty selected_ids([])
  end

  def test_react_native_change_selects_both_react_native_applications
    assert_equal ["react-native-ios", "react-native-android"], selected_ids(["platforms/react-native/src/index.ts"])
  end

  def test_android_change_selects_kotlin_android_application
    assert_equal ["kotlin-android"], selected_ids(["platforms/android/lib/src/main/java/com/shopify/checkoutkit/Foo.kt"])
  end

  def test_kotlin_protocol_change_selects_kotlin_android_application
    assert_equal ["kotlin-android"], selected_ids(["protocol/languages/kotlin/embedded-checkout-protocol/src/main/Foo.kt"])
  end

  def test_swift_change_selects_swift_ios_application
    assert_equal ["swift-ios"], selected_ids(["platforms/swift/Sources/ShopifyCheckoutKit/Foo.swift"])
  end

  def test_swift_protocol_change_selects_swift_ios_application
    assert_equal ["swift-ios"], selected_ids(["protocol/languages/swift/embedded-checkout-protocol/Sources/Foo.swift"])
  end

  def test_swift_package_change_selects_swift_ios_application
    assert_equal ["swift-ios"], selected_ids(["Package.swift"])
  end

  def test_nested_docs_only_change_selects_no_applications
    assert_empty selected_ids(["platforms/react-native/docs/assets/screenshot.png"])
  end

  def test_shared_ci_filter_change_selects_applications_carrying_ci_filters
    assert_equal ["react-native-ios", "react-native-android", "kotlin-android", "swift-ios"], selected_ids([".ci/changed-file-filters.yml"])
  end

  def test_shared_protocol_change_selects_all_applications
    assert_equal ["react-native-ios", "react-native-android", "kotlin-android", "swift-ios"], selected_ids(["protocol/schemas/ucp.json"])
  end

  def test_bitrise_env_reports_runs_present_when_applications_selected
    env = plan(changed_files: ["platforms/react-native/src/index.ts"]).bitrise_env

    assert_equal "true", env.fetch("E2E_HAS_E2E_RUNS")
    assert_equal "4", env.fetch("E2E_BROWSERSTACK_RUN_PLAN_COUNT")
    assert_equal "4", env.fetch("E2E_BROWSERSTACK_RUN_PLAN_PARALLEL_COUNT")
    assert_equal "true", env.fetch("E2E_BUILD_REACT_NATIVE_IOS")
    assert_equal "true", env.fetch("E2E_BUILD_REACT_NATIVE_ANDROID")
    assert_equal "false", env.fetch("E2E_BUILD_KOTLIN_ANDROID")
    assert_equal "false", env.fetch("E2E_BUILD_SWIFT_IOS")
  end

  def test_bitrise_env_reports_swift_ios_build_on_swift_change
    env = plan(changed_files: ["platforms/swift/Sources/ShopifyCheckoutKit/Foo.swift"]).bitrise_env

    assert_equal "true", env.fetch("E2E_HAS_E2E_RUNS")
    assert_equal "2", env.fetch("E2E_BROWSERSTACK_RUN_PLAN_COUNT")
    assert_equal "2", env.fetch("E2E_BROWSERSTACK_RUN_PLAN_PARALLEL_COUNT")
    assert_equal "true", env.fetch("E2E_BUILD_SWIFT_IOS")
    assert_equal "false", env.fetch("E2E_BUILD_REACT_NATIVE_IOS")
    assert_equal "false", env.fetch("E2E_BUILD_KOTLIN_ANDROID")
  end

  def test_bitrise_env_reports_kotlin_android_build_on_android_change
    env = plan(changed_files: ["platforms/android/lib/src/main/java/com/shopify/checkoutkit/Foo.kt"]).bitrise_env

    assert_equal "true", env.fetch("E2E_HAS_E2E_RUNS")
    assert_equal "2", env.fetch("E2E_BROWSERSTACK_RUN_PLAN_COUNT")
    assert_equal "2", env.fetch("E2E_BROWSERSTACK_RUN_PLAN_PARALLEL_COUNT")
    assert_equal "true", env.fetch("E2E_BUILD_KOTLIN_ANDROID")
    assert_equal "false", env.fetch("E2E_BUILD_REACT_NATIVE_IOS")
    assert_equal "false", env.fetch("E2E_BUILD_REACT_NATIVE_ANDROID")
  end

  def test_bitrise_env_reports_no_runs_when_nothing_selected
    env = plan(changed_files: ["platforms/react-native/docs/assets/screenshot.png"]).bitrise_env

    assert_equal "false", env.fetch("E2E_HAS_E2E_RUNS")
    assert_equal "0", env.fetch("E2E_BROWSERSTACK_RUN_PLAN_COUNT")
    assert_equal "1", env.fetch("E2E_BROWSERSTACK_RUN_PLAN_PARALLEL_COUNT")
    assert_equal "false", env.fetch("E2E_BUILD_REACT_NATIVE_IOS")
    assert_equal "false", env.fetch("E2E_BUILD_REACT_NATIVE_ANDROID")
    assert_equal "false", env.fetch("E2E_BUILD_KOTLIN_ANDROID")
    assert_equal "false", env.fetch("E2E_BUILD_SWIFT_IOS")
  end

  def test_load_reads_configuration_from_disk
    loaded = E2EMatrixToBrowserStackRunPlan.load(MATRIX_PATH, changed_files: ["platforms/react-native/src/index.ts"])

    assert_equal ["react-native-ios", "react-native-android"], loaded.selected_applications.map { |application| application.fetch("id") }
  end

  def test_build_env_key_sanitizes_application_id
    assert_equal "E2E_BUILD_REACT_NATIVE_IOS", plan.send(:build_env_key, "react-native-ios")
    assert_equal "E2E_BUILD_REACT_NATIVE_ANDROID", plan.send(:build_env_key, "react-native-android")
    assert_equal "E2E_BUILD_KOTLIN_ANDROID", plan.send(:build_env_key, "kotlin-android")
    assert_equal "E2E_BUILD_SWIFT_IOS", plan.send(:build_env_key, "swift-ios")
  end

  def test_application_changed_file_filter_names_prefers_plural
    application = {"changed_files_filters" => ["reactNative", "e2e"]}

    assert_equal ["reactNative", "e2e"], plan.send(:application_changed_file_filter_names, application)
  end

  def test_application_changed_file_filter_names_falls_back_to_singular
    application = {"changed_files_filter" => "reactNative"}

    assert_equal ["reactNative"], plan.send(:application_changed_file_filter_names, application)
  end

  def test_application_without_filters_matches_regardless_of_changed_files
    application = {"id" => "no-filters"}

    assert_empty plan.send(:application_changed_file_filter_names, application)
    assert plan.send(:application_matches_changed_files?, application)
  end

  def test_validation_errors_flags_unknown_filter_name
    config = base_config
    config.fetch("applications").first["changed_files_filters"] = ["reactNative", "doesNotExist"]

    errors = plan(config: config).validation_errors

    assert_includes errors, "application react-native-ios references unknown changed file filter doesNotExist"
  end

  def test_validation_errors_flags_missing_filters
    config = base_config
    application = config.fetch("applications").first
    application.delete("changed_files_filters")
    application.delete("changed_files_filter")

    errors = plan(config: config).validation_errors

    assert_includes errors, "application react-native-ios missing changed_files_filters"
  end

  def test_validation_errors_flags_missing_changed_file_filters_path
    config = base_config
    config.delete("changed_file_filters")

    errors = plan(config: config).validation_errors

    assert_includes errors, "changed_file_filters must point to a shared filter file"
  end

  def test_validation_errors_flags_nonexistent_changed_file_filters_path
    config = base_config
    config["changed_file_filters"] = "config/does-not-exist.yml"

    errors = plan(config: config).validation_errors

    assert(errors.any? { |error| error.start_with?("changed_file_filters file does not exist") })
  end

  def test_real_matrix_has_no_validation_errors
    assert_empty E2EMatrixToBrowserStackRunPlan.load(MATRIX_PATH).validation_errors
  end

  def test_validation_errors_flags_non_array_changed_files_filters
    config = base_config
    config.fetch("applications").first["changed_files_filters"] = "reactNative"

    errors = plan(config: config).validation_errors

    assert_includes errors, "application react-native-ios changed_files_filters must be an array"
  end

  def test_expand_reports_an_invalid_application_platform
    config = base_config
    config.fetch("applications").first["platform"] = "windows"

    error = assert_raises(RuntimeError) { plan(config: config).expand }

    assert_includes error.message, "application react-native-ios platform must be ios or android"
  end

  def test_bitrise_env_raises_on_invalid_config
    assert_raises(RuntimeError) { plan(config: {"version" => 2}).bitrise_env }
  end

  def test_missing_build_workflows_flags_selected_target_absent_from_pipeline
    available = ["e2e-build-react-native-ios", "e2e-build-react-native-android"]
    missing = plan(changed_files: ["platforms/swift/Sources/ShopifyCheckoutKit/Foo.swift"])
      .missing_build_workflows(available)

    assert_equal ["e2e-build-swift-ios"], missing
  end

  def test_missing_build_workflows_empty_when_all_present
    available = [
      "e2e-build-react-native-ios",
      "e2e-build-react-native-android",
      "e2e-build-kotlin-android",
      "e2e-build-swift-ios"
    ]
    missing = plan(changed_files: ["platforms/swift/Sources/ShopifyCheckoutKit/Foo.swift"])
      .missing_build_workflows(available)

    assert_empty missing
  end

  def test_missing_build_workflows_empty_when_nothing_selected
    missing = plan(changed_files: ["platforms/react-native/docs/assets/screenshot.png"])
      .missing_build_workflows([])

    assert_empty missing
  end

  def test_missing_build_workflow_errors_names_the_missing_target
    messages = plan(changed_files: ["platforms/swift/Sources/ShopifyCheckoutKit/Foo.swift"])
      .missing_build_workflow_errors(["e2e-build-react-native-ios"])

    assert_equal 1, messages.length
    assert_includes messages.first, "no 'e2e-build-swift-ios' workflow."
    refute_includes messages.first, "Your branch predates"
  end

  def test_missing_build_workflow_errors_empty_when_all_present
    messages = plan(changed_files: ["platforms/swift/Sources/ShopifyCheckoutKit/Foo.swift"])
      .missing_build_workflow_errors(["e2e-build-swift-ios"])

    assert_empty messages
  end

  def test_missing_build_workflow_hint_covers_both_directions_of_drift
    hint = E2EMatrixToBrowserStackRunPlan::MISSING_BUILD_WORKFLOW_HINT

    assert_includes hint, "Rebase on main"
    assert_includes hint, "e2e/config/matrix.yml"
  end
end
