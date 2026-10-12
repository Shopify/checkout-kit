# frozen_string_literal: true

require "minitest/autorun"
require_relative "../lib/bitrise_pipeline_stages"
require_relative "../lib/swift_coverage_status"

class SwiftCoverageStatusTest < Minitest::Test
  def state(plan: "succeeded", swift: nil, selected: true)
    entries = [{"name" => "ci-ios-plan", "status" => plan, "external_id" => "plan-build"}]
    entries << {"name" => "ci-ios-swift-package-tests", "status" => swift, "external_id" => "swift-build"} if swift
    SwiftCoverageStatus.state(BitrisePipelineStages.new(entries), selected ? ["swift-package-tests"] : [])
  end

  def test_only_deliberately_unselected_jobs_are_skipped
    assert_equal "skipped", state(selected: false)
    assert_equal "failed", state(plan: "failed", selected: false)
    assert_equal "failed", state
    assert_equal "failed", state(swift: "failed")
  end

  def test_a_successful_job_without_a_published_measurement_is_unavailable
    assert_equal "unavailable", state(swift: "succeeded")
  end
end
