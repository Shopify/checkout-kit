# frozen_string_literal: true

require "minitest/autorun"
require_relative "../lib/coverage_thresholds"

class CoverageThresholdsTest < Minitest::Test
  Report = Struct.new(:platform, :rows)

  def threshold_failures(rows, configuration = {"android" => {"Lines" => 85}})
    CoverageThresholds.new(configuration).failures(Report.new("android", rows))
  end

  def test_exact_threshold_passes_but_rounding_cannot_hide_a_failure
    assert_empty threshold_failures([["Lines", 85, 100]])
    assert_equal 1, threshold_failures([["Lines", 849999, 1000000]]).length
    assert_empty threshold_failures([["Lines", 86, 100]])
  end

  def test_missing_or_uninstrumented_code_does_not_pass
    assert_match(/missing/, threshold_failures([]).first)
    assert_match(/no executable code/, threshold_failures([["Lines", 0, 0]]).first)
  end

  def test_unconfigured_metrics_remain_report_only
    assert_empty threshold_failures([["Lines", 90, 100], ["Branches", 1, 100]])
  end

  def test_every_configured_target_must_pass_independently
    configuration = {"android" => {"First" => 85, "Second" => 85}}
    result = threshold_failures([["First", 99, 100], ["Second", 70, 100]], configuration)
    assert_equal ["Second: 70.00% (70/100) is below 85%"], result
  end

  def test_invalid_configuration_fails_closed
    assert_raises(KeyError) { threshold_failures([], {}) }
    [-1, 101, "85", Float::NAN].each do |minimum|
      assert_raises(RuntimeError) { threshold_failures([["Lines", 90, 100]], {"android" => {"Lines" => minimum}}) }
    end
  end
end
