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

  def test_there_is_at_least_one_test_to_check
    refute_empty(test_files)
    refute_empty(shared_test_files)
  end
end
