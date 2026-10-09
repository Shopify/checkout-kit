# frozen_string_literal: true

require "json"
require_relative "e2e_matrix_to_browserstack_run_plan"

# Reuse the matrix's target selection and tag validation for the host runners.
class BitriseE2ERunPlan < E2EMatrixToBrowserStackRunPlan
  def validation_errors
    errors = super
    unless @config["os_version_tags"] == ["latest"]
      errors << "Direct Bitrise runs support one pinned simulator/emulator per application; os_version_tags must be [latest]"
    end
    errors
  end

  def bitrise_env
    ensure_valid!
    ids = selected_applications.map { |application| application.fetch("id") }
    env = {
      "E2E_DIRECT_PLAN_READY" => "true",
      "E2E_DIRECT_SELECTED_APPLICATIONS" => JSON.generate(ids)
    }
    applications.each do |application|
      id = application.fetch("id")
      env["E2E_RUN_#{id.upcase.tr("-", "_")}"] = ids.include?(id).to_s
    end
    env
  end

  def ensure_pipeline_coverage!(config)
    ensure_valid!
    graph = config.dig("pipelines", "e2e", "workflows") || {}
    definitions = config.fetch("workflows", {})
    missing = selected_applications.map { |application| "e2e-maestro-#{application.fetch("id")}" }
      .reject { |name| graph.key?(name) && definitions.key?(name) }
    return if missing.empty?

    raise "E2E pipeline is missing selected workflows: #{missing.join(", ")}. Rebase on main or update the matrix and pipeline together."
  end
end
