# frozen_string_literal: true

require "minitest/autorun"
require "yaml"

class BitriseConfigTest < Minitest::Test
  E2E_ROOT = File.expand_path("..", __dir__)
  CONFIG_PATH = File.join(E2E_ROOT, "bitrise.yml")
  FORBIDDEN_STEPS = ["activate-build-cache-for-xcode", "activate-build-cache-for-gradle"].freeze
  UNSUPPORTED_REGEX_SYNTAX = {
    "lookahead (?=…) or (?!…)" => /\(\?!|\(\?=/,
    "lookbehind (?<=…) or (?<!…)" => /\(\?<[=!]/,
    "atomic group (?>…)" => /\(\?>/,
    "backreference" => /\\[1-9]/
  }.freeze

  def config
    @config ||= YAML.safe_load_file(CONFIG_PATH, aliases: true)
  end

  def pipelines
    config.fetch("pipelines", {})
  end

  def workflows
    config.fetch("workflows", {})
  end

  def triggered_pipelines
    config.fetch("trigger_map", []).filter_map { |entry| entry["pipeline"] }.uniq
  end

  def script_steps(steps)
    Array(steps).flat_map(&:to_a).select { |id, _step| id.start_with?("script@") }
  end

  def step_ids(steps)
    Array(steps).flat_map(&:keys)
  end

  def test_every_pipeline_workflow_exists
    missing = pipelines.flat_map do |pipeline, definition|
      definition.fetch("workflows", {}).keys.reject { |name| workflows.key?(name) }
        .map { |name| "#{pipeline} -> #{name}" }
    end

    assert_empty missing, "Pipelines reference workflows that do not exist:\n#{missing.join("\n")}"
  end

  def test_every_workflow_that_overrides_its_machine_declares_both_stack_and_size
    incomplete = workflows.filter_map do |name, definition|
      machine = definition.dig("meta", "bitrise.io")
      next if machine.nil?
      next if machine.key?("stack") && machine.key?("machine_type_id")

      "#{name}: #{machine.keys.sort.join(", ")}"
    end

    assert_empty incomplete, "Workflows overriding meta.bitrise.io must set stack and machine_type_id:\n#{incomplete.join("\n")}"
  end

  def test_every_workflow_script_step_declares_a_wall_clock_budget
    unbudgeted = workflows.flat_map do |name, definition|
      script_steps(definition["steps"]).filter_map do |_id, step|
        missing = ["timeout", "no_output_timeout"].reject { |key| step.key?(key) }
        "#{name}: #{step["title"]} (missing #{missing.join(", ")})" unless missing.empty?
      end
    end

    assert_empty unbudgeted, "Workflow script steps must set timeout and no_output_timeout:\n#{unbudgeted.join("\n")}"
  end

  def test_no_workflow_activates_the_disabled_build_cache_add_on
    activations = workflows.flat_map do |name, definition|
      step_ids(definition["steps"])
        .select { |id| FORBIDDEN_STEPS.any? { |forbidden| id.start_with?(forbidden) } }
        .map { |id| "#{name}: #{id}" }
    end

    assert_empty activations, "The Bitrise Build Cache add-on is disabled for Shopify apps:\n#{activations.join("\n")}"
  end

  def test_trigger_regexes_use_only_syntax_that_re2_compiles
    offenders = config.fetch("trigger_map", []).flat_map do |entry|
      regex = entry.dig("changed_files", "regex")
      next [] if regex.nil?

      UNSUPPORTED_REGEX_SYNTAX.filter_map { |label, pattern| "#{entry["pipeline"]}: #{label}" if regex.match?(pattern) }
    end

    assert_empty offenders, "Bitrise evaluates changed_files.regex with RE2:\n#{offenders.join("\n")}"
  end

  # A restore with no matching save warms nothing: the key never gets written, so every
  # build pays full price while looking cached. YAML resolves the anchors both sides share,
  # so comparing the resolved key strings catches a save that drifted onto a different key.
  def test_every_restored_cache_is_also_saved
    containers = workflows.merge(config.fetch("step_bundles", {}))

    unsaved = containers.flat_map do |name, definition|
      restored = cache_keys(definition["steps"], "restore-cache@")
      saved = cache_keys(definition["steps"], "save-cache@")
      (restored - saved).map { |key| "#{name}: #{key}" }
    end

    assert_empty unsaved, "These caches are restored but never saved:\n#{unsaved.join("\n")}"
  end

  def cache_keys(steps, prefix)
    Array(steps).flat_map(&:to_a)
      .select { |id, _step| id.start_with?(prefix) }
      .flat_map { |_id, step| Array(step["inputs"]).filter_map { |input| input["key"] } }
      .map(&:strip)
  end

  def test_every_triggered_pipeline_reports_a_status_unique_to_itself
    anonymous = triggered_pipelines.reject do |pipeline|
      pipelines.dig(pipeline, "status_report_name").to_s.include?("<target_id>")
    end

    assert_empty anonymous, "Without <target_id> a second pipeline overwrites this one's commit status:\n#{anonymous.join("\n")}"
  end
end
