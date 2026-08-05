# frozen_string_literal: true

require "minitest/autorun"
require "yaml"

class MaestroTestTagsTest < Minitest::Test
  E2E_ROOT = File.expand_path("..", __dir__)
  JOURNEY_TAGS = ["launch", "cart", "checkout", "account"].freeze
  COST_TIER_TAGS = ["smoke", "full"].freeze
  QUARANTINE_TAGS = ["flaky", "wip"].freeze
  PLATFORM_TAGS = ["ios-only", "android-only"].freeze
  KNOWN_TAGS = (JOURNEY_TAGS + COST_TIER_TAGS + QUARANTINE_TAGS + PLATFORM_TAGS).freeze

  def test_files
    Dir.glob("tests/**/*.yaml", base: E2E_ROOT).sort
  end

  def header(path)
    YAML.safe_load(File.read(File.join(E2E_ROOT, path)).split("\n---\n").first)
  end

  def tags(path)
    header(path)["tags"] || []
  end

  def test_every_test_declares_tags
    test_files.each do |path|
      refute_empty(tags(path), "#{path} declares no tags, so no CI run can select it")
    end
  end

  def test_every_tag_belongs_to_the_taxonomy
    test_files.each do |path|
      tags(path).each do |tag|
        assert_includes(KNOWN_TAGS, tag, "#{path} uses the unknown tag #{tag}")
      end
    end
  end

  def test_every_test_declares_one_journey
    test_files.each do |path|
      journeys = tags(path) & JOURNEY_TAGS

      assert_equal(1, journeys.length, "#{path} must declare exactly one journey tag, found #{journeys.inspect}")
    end
  end

  def test_every_test_declares_one_cost_tier
    test_files.each do |path|
      tiers = tags(path) & COST_TIER_TAGS

      assert_equal(1, tiers.length, "#{path} must declare exactly one cost tier tag, found #{tiers.inspect}")
    end
  end

  def test_a_platform_tag_names_the_capability_that_earns_it
    test_files.each do |path|
      next if (tags(path) & PLATFORM_TAGS).empty?

      body = File.read(File.join(E2E_ROOT, path))

      assert_match(
        /#\s*Platform capability:\s*\S+/,
        body,
        "#{path} carries a platform tag, so it must comment `# Platform capability: <name>`"
      )
    end
  end

  def test_the_workspace_config_quarantines_the_quarantine_tags
    config = YAML.safe_load(File.read(File.join(E2E_ROOT, "config.yaml")))

    assert_equal(QUARANTINE_TAGS.sort, (config["excludeTags"] || []).sort)
  end

  def shared_test_files
    test_files.select { |path| path.start_with?("tests/shared/") }
  end

  def matrix
    YAML.safe_load_file(File.join(E2E_ROOT, "config", "matrix.yml"), aliases: true)
  end

  # Tests under tests/shared/ run on every target through the CI matrix. Tests under
  # tests/<platform>/ are local-only, so the matrix is free to ignore their tags.
  def matrix_include_tags
    defaults = matrix.fetch("tags", {}).fetch("include", [])

    matrix.fetch("applications", []).flat_map { |application| application.fetch("include_tags", defaults) }.uniq
  end

  def test_the_matrix_selects_every_journey_a_shared_test_declares
    declared = shared_test_files.flat_map { |path| tags(path) & JOURNEY_TAGS }.uniq
    unselected = declared - matrix_include_tags

    assert_empty(
      unselected,
      "config/matrix.yml includes no application for #{unselected.inspect}, so those shared tests never run in CI"
    )
  end

  CREDENTIAL_VARIABLES = ["E2E_CUSTOMER_ACCOUNT_EMAIL", "E2E_CUSTOMER_ACCOUNT_CODE"].freeze

  def authored_files
    Dir.glob("{tests,flows}/**/*.yaml", base: E2E_ROOT).sort
  end

  # This repository is public. The runner reads the account credentials from Bitrise
  # secrets or an untracked .env, so no committed file may carry a value for them.
  def test_no_authored_file_assigns_a_customer_account_credential
    authored_files.each do |path|
      body = File.read(File.join(E2E_ROOT, path))

      CREDENTIAL_VARIABLES.each do |variable|
        refute_match(
          /^\s*#{variable}\s*:/,
          body,
          "#{path} assigns #{variable}, which must reach Maestro from the runner instead"
        )
      end
    end
  end

  def env(path)
    header(path)["env"] || {}
  end

  # BrowserStack runs every test of one target in one session on one device, and the launch
  # flow no longer clears app state, so state survives from one test to the next. A test
  # that submits an order must therefore state the identity it wants rather than inherit it.
  def test_every_order_test_declares_a_buyer_identity_mode
    shared_test_files.select { |path| tags(path).include?("full") }.each do |path|
      assert_match(
        /buyerIdentityMode=\w+/,
        env(path)["E2E_CART_PARAMS"].to_s,
        "#{path} submits an order, so E2E_CART_PARAMS must set buyerIdentityMode"
      )
    end
  end

  # Maestro 2.4.0 implements iOS clearState by uninstalling the app. On a BrowserStack real
  # device the reinstall reports success and never restores the app, so the next launch
  # lands on the home screen. Eight builds with the flag failed on five different units and
  # three builds without it passed, so the fault is deterministic rather than flaky.
  # Seeding the cart resets it anyway, so the flag buys nothing.
  def test_the_launch_flow_never_clears_app_state
    commands = File.readlines(File.join(E2E_ROOT, "flows", "app", "launch.yaml"))
      .reject { |line| line.strip.start_with?("#") }
      .join

    refute_match(
      /clearState/,
      commands,
      "clearState uninstalls the iOS app on BrowserStack and never reinstalls it"
    )
  end

  def test_the_dismiss_flow_only_taps_an_enabled_element
    body = File.read(File.join(E2E_ROOT, "flows", "checkout", "dismiss-active-field.yaml"))

    refute_match(
      /^\s*(?:visible|tapOn):\s*"selected"\s*$/,
      body,
      "a bare `selected` selector matches a disabled 24 by 22 pixel node on iOS, and Maestro " \
        "then taps the fixed point behind it after every text entry, so the selector must " \
        "also require enabled: true"
    )
  end

  # The scripts filter is the only thing that selects the scripts-test job, and that job is the
  # only thing that runs this file. Several guards here read flows/, so the filter must watch it.
  def scripts_filter_paths
    workflow = YAML.safe_load_file(File.expand_path("../.github/workflows/ci.yml", E2E_ROOT), aliases: true)
    step = workflow.fetch("jobs").fetch("changes").fetch("steps").find { |candidate| candidate["id"] == "infra" }

    YAML.safe_load(step.fetch("with").fetch("filters")).fetch("scripts")
  end

  def test_ci_runs_the_ruby_suite_when_a_flow_changes
    assert_includes(
      scripts_filter_paths,
      "e2e/flows/**",
      "the scripts filter in .github/workflows/ci.yml must watch e2e/flows/**, or a commit that " \
        "only edits a flow runs none of the guards in this file"
    )
  end

  def test_there_is_at_least_one_test_to_check
    refute_empty(test_files)
    refute_empty(shared_test_files)
  end
end
