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

  def test_nil_changed_files_selects_all_applications
    assert_equal ["react-native-ios", "react-native-android"], selected_ids(nil)
  end

  def test_empty_changed_files_selects_no_applications
    assert_empty selected_ids([])
  end

  def test_react_native_change_selects_both_react_native_applications
    assert_equal ["react-native-ios", "react-native-android"], selected_ids(["platforms/react-native/src/index.ts"])
  end

  def test_nested_docs_only_change_selects_no_applications
    assert_empty selected_ids(["platforms/react-native/docs/assets/screenshot.png"])
  end

  def test_shared_ci_filter_change_selects_applications_carrying_ci_filters
    assert_equal ["react-native-ios", "react-native-android"], selected_ids([".ci/changed-file-filters.yml"])
  end

  def test_bitrise_env_reports_runs_present_when_applications_selected
    env = plan(changed_files: ["platforms/react-native/src/index.ts"]).bitrise_env

    assert_equal "true", env.fetch("E2E_HAS_E2E_RUNS")
    assert_equal "2", env.fetch("E2E_BROWSERSTACK_RUN_PLAN_COUNT")
    assert_equal "2", env.fetch("E2E_BROWSERSTACK_RUN_PLAN_PARALLEL_COUNT")
    assert_equal "true", env.fetch("E2E_BUILD_REACT_NATIVE_IOS")
    assert_equal "true", env.fetch("E2E_BUILD_REACT_NATIVE_ANDROID")
  end

  def test_bitrise_env_reports_no_runs_when_nothing_selected
    env = plan(changed_files: ["platforms/react-native/docs/assets/screenshot.png"]).bitrise_env

    assert_equal "false", env.fetch("E2E_HAS_E2E_RUNS")
    assert_equal "0", env.fetch("E2E_BROWSERSTACK_RUN_PLAN_COUNT")
    assert_equal "1", env.fetch("E2E_BROWSERSTACK_RUN_PLAN_PARALLEL_COUNT")
    assert_equal "false", env.fetch("E2E_BUILD_REACT_NATIVE_IOS")
    assert_equal "false", env.fetch("E2E_BUILD_REACT_NATIVE_ANDROID")
  end

  def test_load_reads_configuration_from_disk
    loaded = E2EMatrixToBrowserStackRunPlan.load(MATRIX_PATH, changed_files: ["platforms/react-native/src/index.ts"])

    assert_equal ["react-native-ios", "react-native-android"], loaded.selected_applications.map { |application| application.fetch("id") }
  end

  def test_build_env_key_sanitizes_application_id
    assert_equal "E2E_BUILD_REACT_NATIVE_IOS", plan.send(:build_env_key, "react-native-ios")
    assert_equal "E2E_BUILD_REACT_NATIVE_ANDROID", plan.send(:build_env_key, "react-native-android")
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

  def test_expand_raises_on_invalid_config
    error = assert_raises(RuntimeError) { plan(config: {"version" => 2}).expand }

    assert_match(/E2E matrix is invalid/, error.message)
  end

  def test_bitrise_env_raises_on_invalid_config
    assert_raises(RuntimeError) { plan(config: {"version" => 2}).bitrise_env }
  end
end
