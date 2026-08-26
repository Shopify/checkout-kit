# frozen_string_literal: true

require "minitest/autorun"
require "yaml"
require_relative "../lib/ios_ci_run_plan"

class IOSCIRunPlanTest < Minitest::Test
  CONFIG_PATH = File.expand_path("../config/ios_ci.yml", __dir__)
  PIPELINE_PATH = File.expand_path("../bitrise.yml", __dir__)

  SWIFT_FILTERS = ["swift", "protocolSwift", "protocolShared", "packageSwift", "ciFilters", "iosCiConfig"].freeze
  REACT_NATIVE_FILTERS = ["reactNative", "protocolTypescript", "protocolShared", "packageSwift", "ciFilters", "iosCiConfig"].freeze

  # The real config carries only the jobs already ported to Bitrise, so the four-job
  # selection rules are exercised against a fixture that names all four macOS jobs.
  def four_job_config
    {
      "version" => 1,
      "changed_file_filters" => ".ci/changed-file-filters.yml",
      "jobs" => [
        {"id" => "swift-package-tests", "changed_files_filters" => SWIFT_FILTERS},
        {"id" => "swift-samples", "changed_files_filters" => SWIFT_FILTERS},
        {"id" => "react-native-build-ios", "changed_files_filters" => REACT_NATIVE_FILTERS},
        {"id" => "react-native-test-ios", "changed_files_filters" => REACT_NATIVE_FILTERS}
      ]
    }
  end

  def plan(changed_files: nil, config: four_job_config)
    IOSCIRunPlan.new(CONFIG_PATH, config, changed_files: changed_files)
  end

  def selected_ids(changed_files)
    plan(changed_files: changed_files).selected_job_ids
  end

  def pipeline_config
    @pipeline_config ||= YAML.safe_load_file(PIPELINE_PATH, aliases: true)
  end

  def ci_ios_workflows
    pipeline_config.dig("pipelines", "ci-ios", "workflows") || {}
  end

  def test_nil_changed_files_selects_every_job
    assert_equal(
      ["swift-package-tests", "swift-samples", "react-native-build-ios", "react-native-test-ios"],
      selected_ids(nil)
    )
  end

  def test_empty_changed_files_selects_no_job
    assert_empty selected_ids([])
  end

  def test_swift_change_selects_only_the_swift_jobs
    assert_equal(
      ["swift-package-tests", "swift-samples"],
      selected_ids(["platforms/swift/Sources/ShopifyCheckoutKit/Foo.swift"])
    )
  end

  def test_react_native_change_selects_only_the_react_native_jobs
    assert_equal(
      ["react-native-build-ios", "react-native-test-ios"],
      selected_ids(["platforms/react-native/src/index.ts"])
    )
  end

  # ci.yml lists Package.swift under both the swift and reactNativeIos infra filters,
  # so a manifest change has to keep selecting all four macOS jobs after the port.
  def test_swift_package_manifest_change_selects_every_job
    assert_equal(
      ["swift-package-tests", "swift-samples", "react-native-build-ios", "react-native-test-ios"],
      selected_ids(["Package.swift"])
    )
  end

  def test_docs_only_change_selects_no_job
    assert_empty selected_ids(["platforms/swift/docs/usage.md"])
  end

  # An e2e/** edit that only touches Maestro flows must not boot four macOS machines,
  # so the iOS jobs subscribe to the narrower iosCiConfig filter instead.
  def test_maestro_flow_change_selects_no_job
    assert_empty selected_ids(["e2e/tests/checkout/launch.yaml"])
  end

  def test_pipeline_config_change_selects_every_job
    assert_equal(
      ["swift-package-tests", "swift-samples", "react-native-build-ios", "react-native-test-ios"],
      selected_ids(["e2e/bitrise.yml"])
    )
  end

  def test_flag_names_derive_from_job_ids
    assert_equal(
      [
        "CI_IOS_SWIFT_PACKAGE_TESTS",
        "CI_IOS_SWIFT_SAMPLES",
        "CI_IOS_REACT_NATIVE_BUILD_IOS",
        "CI_IOS_REACT_NATIVE_TEST_IOS"
      ],
      plan.flag_names
    )
  end

  def test_bitrise_env_publishes_one_flag_per_job
    env = plan(changed_files: ["platforms/swift/Sources/ShopifyCheckoutKit/Foo.swift"]).bitrise_env

    assert_equal "true", env.fetch("CI_IOS_HAS_JOBS")
    assert_equal "swift-package-tests,swift-samples", env.fetch("CI_IOS_SELECTED_JOBS")
    assert_equal "true", env.fetch("CI_IOS_SWIFT_PACKAGE_TESTS")
    assert_equal "true", env.fetch("CI_IOS_SWIFT_SAMPLES")
    assert_equal "false", env.fetch("CI_IOS_REACT_NATIVE_BUILD_IOS")
    assert_equal "false", env.fetch("CI_IOS_REACT_NATIVE_TEST_IOS")
  end

  def test_bitrise_env_reports_no_jobs_on_a_docs_only_change
    env = plan(changed_files: ["platforms/swift/docs/usage.md"]).bitrise_env

    assert_equal "false", env.fetch("CI_IOS_HAS_JOBS")
    assert_equal "", env.fetch("CI_IOS_SELECTED_JOBS")
    assert_equal "false", env.fetch("CI_IOS_SWIFT_PACKAGE_TESTS")
  end

  def test_missing_workflows_names_a_selected_job_absent_from_the_pipeline
    missing = plan(changed_files: ["platforms/swift/Sources/ShopifyCheckoutKit/Foo.swift"])
      .missing_workflows(["ci-ios-swift-package-tests"])

    assert_equal ["ci-ios-swift-samples"], missing
  end

  def test_missing_workflow_errors_name_the_missing_job
    messages = plan(changed_files: ["platforms/swift/Sources/ShopifyCheckoutKit/Foo.swift"])
      .missing_workflow_errors(["ci-ios-swift-package-tests"])

    assert_equal 1, messages.length
    assert_includes messages.first, "no 'ci-ios-swift-samples' workflow."
  end

  def test_missing_workflow_errors_empty_when_nothing_is_selected
    assert_empty plan(changed_files: ["platforms/swift/docs/usage.md"]).missing_workflow_errors([])
  end

  def test_missing_workflow_hint_covers_both_directions_of_drift
    hint = IOSCIRunPlan::MISSING_WORKFLOW_HINT

    assert_includes hint, "Rebase on main"
    assert_includes hint, "e2e/config/ios_ci.yml"
  end

  def test_validation_errors_flags_a_wrong_version
    assert_includes plan(config: four_job_config.merge("version" => 2)).validation_errors, "version must be 1"
  end

  def test_validation_errors_flags_an_unknown_filter_name
    config = four_job_config
    config.fetch("jobs").first["changed_files_filters"] = ["swift", "doesNotExist"]

    assert_includes(
      plan(config: config).validation_errors,
      "job swift-package-tests references unknown changed file filter doesNotExist"
    )
  end

  def test_validation_errors_flags_missing_filters
    config = four_job_config
    config.fetch("jobs").first.delete("changed_files_filters")

    assert_includes plan(config: config).validation_errors, "job swift-package-tests missing changed_files_filters"
  end

  def test_validation_errors_flags_non_array_filters
    config = four_job_config
    config.fetch("jobs").first["changed_files_filters"] = "swift"

    assert_includes plan(config: config).validation_errors, "job swift-package-tests changed_files_filters must be an array"
  end

  def test_validation_errors_flags_duplicate_job_ids
    config = four_job_config
    config.fetch("jobs").last["id"] = "swift-package-tests"

    assert_includes plan(config: config).validation_errors, "job ids must be unique"
  end

  def test_validation_errors_flags_a_missing_changed_file_filters_path
    config = four_job_config
    config.delete("changed_file_filters")

    assert_includes plan(config: config).validation_errors, "changed_file_filters must point to a shared filter file"
  end

  def test_bitrise_env_raises_on_invalid_config
    assert_raises(RuntimeError) { plan(config: {"version" => 2}).bitrise_env }
  end

  def test_load_reads_configuration_from_disk
    loaded = IOSCIRunPlan.load(CONFIG_PATH, changed_files: ["platforms/swift/Sources/ShopifyCheckoutKit/Foo.swift"])

    assert_includes loaded.selected_job_ids, "swift-package-tests"
  end

  def test_real_config_has_no_validation_errors
    assert_empty IOSCIRunPlan.load(CONFIG_PATH).validation_errors
  end

  # Both halves of the gate have to move together: a job added to ios_ci.yml without a
  # run_if block runs unconditionally, and a run_if block reading a flag no job emits
  # never becomes true, so its workflow is skipped forever.
  def test_every_declared_job_owns_exactly_one_pipeline_run_if_flag
    consumed = ci_ios_workflows.values
      .filter_map { |workflow| workflow.dig("run_if", "expression") }
      .flat_map { |expression| expression.scan(/CI_IOS_[A-Z0-9_]+/) }
      .uniq

    assert_equal IOSCIRunPlan.load(CONFIG_PATH).flag_names.sort, consumed.sort
  end

  def test_every_declared_job_has_a_pipeline_workflow
    assert_empty IOSCIRunPlan.load(CONFIG_PATH).missing_workflows(ci_ios_workflows.keys)
  end

  # A flag that ci-ios-plan computes but never shares stays unset in every later
  # workflow, so its run_if silently evaluates false.
  def test_the_plan_workflow_shares_every_flag_it_publishes
    steps = pipeline_config.dig("workflows", "ci-ios-plan", "steps") || []
    shared = steps
      .filter_map { |step| step["share-pipeline-variable@1"] }
      .flat_map { |step| step.fetch("inputs", []).filter_map { |input| input["variables"] } }
      .flat_map { |variables| variables.split("\n") }
      .map(&:strip)
      .reject(&:empty?)

    expected = IOSCIRunPlan.load(CONFIG_PATH).flag_names + ["CI_IOS_HAS_JOBS", "CI_IOS_SELECTED_JOBS"]

    assert_equal expected.sort, shared.sort
  end
end
