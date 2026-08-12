# frozen_string_literal: true

require "json"
require "minitest/autorun"
require_relative "../lib/bitrise_pipeline_stages"
require_relative "../lib/ios_ci_reporter"

class IOSCIReporterTest < Minitest::Test
  def workflow(name, status: "succeeded", external_id: "build-slug")
    {"name" => name, "status" => status, "external_id" => external_id}
  end

  def stage_roster(*workflows)
    BitrisePipelineStages.from_json(JSON.generate(workflows), app_slug: "app-slug")
  end

  def reporter(selected_job_ids:, stages:, job_ids: nil)
    IOSCIReporter.new(
      job_ids: job_ids || selected_job_ids,
      selected_job_ids: selected_job_ids,
      repository: "Shopify/checkout-kit",
      sha: "abc123",
      token: "token",
      stages: stages,
      pipeline_url: "https://app.bitrise.io/build/pipeline"
    )
  end

  def test_the_check_name_is_the_literal_the_ruleset_pins
    assert_equal "Checkout Kit iOS", IOSCIReporter::CHECK_NAME
    assert_equal "Checkout Kit iOS", reporter(selected_job_ids: [], stages: stage_roster).check_run_payload.fetch(:name)
  end

  def test_every_selected_job_succeeding_passes
    stages = stage_roster(
      workflow("ci-ios-plan"),
      workflow("ci-ios-swift-package-tests")
    )

    assert_equal "success", reporter(selected_job_ids: ["swift-package-tests"], stages: stages).conclusion
  end

  def test_a_selected_job_that_failed_fails
    stages = stage_roster(
      workflow("ci-ios-plan"),
      workflow("ci-ios-swift-package-tests", status: "failed")
    )

    assert_equal "failure", reporter(selected_job_ids: ["swift-package-tests"], stages: stages).conclusion
  end

  # A skipped workflow carries a blank external_id, which is indistinguishable from a
  # stage the pipeline never reached. Only the gate's own selection tells them apart.
  def test_a_job_the_gate_did_not_select_is_ignored
    stages = stage_roster(
      workflow("ci-ios-plan"),
      workflow("ci-ios-swift-package-tests"),
      workflow("ci-ios-swift-samples", status: "", external_id: "")
    )
    report = reporter(
      job_ids: ["swift-package-tests", "swift-samples"],
      selected_job_ids: ["swift-package-tests"],
      stages: stages
    )

    assert_equal "success", report.conclusion
    assert_includes report.markdown_summary, "`swift-samples`"
    assert_includes report.markdown_summary, "⏭️"
  end

  def test_a_selected_job_that_never_ran_fails
    stages = stage_roster(
      workflow("ci-ios-plan"),
      workflow("ci-ios-swift-package-tests", status: "", external_id: "")
    )
    report = reporter(selected_job_ids: ["swift-package-tests"], stages: stages)

    assert_equal "failure", report.conclusion
    assert_includes report.markdown_summary, "did not run"
  end

  # The gate itself failing means no flag was ever published, so every job workflow is
  # skipped. Reasoning only over selected jobs would then report a false green.
  def test_a_failed_plan_stage_fails_even_though_no_job_was_selected
    stages = stage_roster(workflow("ci-ios-plan", status: "failed"))
    report = reporter(selected_job_ids: [], stages: stages)

    assert_equal "failure", report.conclusion
    assert_includes report.markdown_summary, "ci-ios-plan"
  end

  def test_no_selected_job_with_a_green_plan_passes
    report = reporter(selected_job_ids: [], stages: stage_roster(workflow("ci-ios-plan")))

    assert_equal "success", report.conclusion
    assert_includes report.markdown_summary, "No iOS job ran for this change"
  end

  # ci-ios-report is still running while it writes this check, so its own stage always
  # looks unexecuted. It must never count itself as a missing stage.
  def test_the_report_stage_never_counts_against_itself
    stages = stage_roster(
      workflow("ci-ios-plan"),
      workflow("ci-ios-swift-package-tests"),
      workflow("ci-ios-report", status: "", external_id: "")
    )

    assert_equal "success", reporter(selected_job_ids: ["swift-package-tests"], stages: stages).conclusion
  end

  def test_the_summary_links_the_pipeline_build
    report = reporter(selected_job_ids: [], stages: stage_roster(workflow("ci-ios-plan")))

    assert_includes report.markdown_summary, "https://app.bitrise.io/build/pipeline"
  end

  def test_the_check_run_payload_reports_a_completed_run_against_the_head_sha
    payload = reporter(selected_job_ids: [], stages: stage_roster(workflow("ci-ios-plan"))).check_run_payload

    assert_equal "abc123", payload.fetch(:head_sha)
    assert_equal "completed", payload.fetch(:status)
    assert_equal "success", payload.fetch(:conclusion)
  end
end
