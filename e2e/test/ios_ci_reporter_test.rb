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

  def malformed_stage_roster
    BitrisePipelineStages.from_json("not json", app_slug: "app-slug")
  end

  def reporter(selected_job_ids:, stages:, job_ids: nil, pipeline_url: "https://app.bitrise.io/build/pipeline")
    IOSCIReporter.new(
      job_ids: job_ids || selected_job_ids,
      selected_job_ids: selected_job_ids,
      repository: "Shopify/checkout-kit",
      pr_number: 1,
      token: "token",
      stages: stages,
      pipeline_url: pipeline_url
    )
  end

  def test_the_comment_names_the_report
    body = reporter(selected_job_ids: [], stages: stage_roster).comment_body

    assert_includes body, "<!-- checkout-kit-ios-ci-report -->"
    assert_includes body, "## Checkout Kit iOS"
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

  def test_a_selected_job_that_succeeded_with_abort_fails
    stages = stage_roster(
      workflow("ci-ios-plan"),
      workflow("ci-ios-swift-package-tests", status: "succeeded_with_abort")
    )

    assert_equal "failure", reporter(selected_job_ids: ["swift-package-tests"], stages: stages).conclusion
  end

  def test_a_malformed_stage_roster_fails
    report = reporter(selected_job_ids: ["swift-package-tests"], stages: malformed_stage_roster)

    assert_equal "failure", report.conclusion
    assert_includes report.markdown_summary, "ci-ios-plan"
    assert_includes report.markdown_summary, "did not run"
  end

  def test_an_absent_plan_stage_fails
    stages = stage_roster(workflow("ci-ios-swift-package-tests"))
    report = reporter(selected_job_ids: ["swift-package-tests"], stages: stages)

    assert_equal "failure", report.conclusion
    assert_includes report.markdown_summary, "ci-ios-plan"
    assert_includes report.markdown_summary, "did not run"
  end

  def test_an_absent_selected_job_stage_fails
    report = reporter(selected_job_ids: ["swift-package-tests"], stages: stage_roster(workflow("ci-ios-plan")))

    assert_equal "failure", report.conclusion
    assert_includes report.markdown_summary, "swift-package-tests"
    assert_includes report.markdown_summary, "did not run"
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

  def test_the_comment_omits_the_pipeline_link_when_the_url_is_unavailable
    [nil, "", "  "].each do |url|
      body = reporter(selected_job_ids: [], stages: stage_roster(workflow("ci-ios-plan")), pipeline_url: url).comment_body

      refute_includes body, "[Pipeline build]"
    end
  end
end
