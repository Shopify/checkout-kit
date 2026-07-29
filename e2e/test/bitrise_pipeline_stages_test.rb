# frozen_string_literal: true

require "minitest/autorun"
require "json"
require_relative "../lib/bitrise_pipeline_stages"

class BitrisePipelineStagesTest < Minitest::Test
  APP_SLUG = "f51f9054"

  def workflow(name, status: "succeeded", external_id: nil)
    {
      "name" => name,
      "status" => {"Name" => status, "StatusLevel" => 5},
      "external_id" => external_id.nil? ? "build-#{name}" : external_id
    }
  end

  def stages(*workflows)
    BitrisePipelineStages.from_json(JSON.generate(workflows), app_slug: APP_SLUG)
  end

  def test_succeeded_stage_is_not_reported
    roster = stages(workflow("e2e-build-swift-ios"))

    assert_empty roster.failed
    assert_empty roster.not_executed
  end

  def test_succeeded_with_abort_is_not_reported
    roster = stages(workflow("e2e-build-swift-ios", status: "succeeded_with_abort"))

    assert_empty roster.failed
  end

  def test_failed_stage_is_named_with_its_build_url
    roster = stages(workflow("e2e-build-react-native-ios", status: "failed", external_id: "a7111bcd"))

    assert_equal ["e2e-build-react-native-ios"], roster.failed.map(&:name)
    assert_equal "https://app.bitrise.io/app/#{APP_SLUG}/build/a7111bcd", roster.failed.first.build_url
  end

  def test_unrecognized_status_counts_as_failed
    roster = stages(workflow("e2e-build-swift-ios", status: "cancelled"))

    assert_equal ["e2e-build-swift-ios"], roster.failed.map(&:name)
  end

  def test_unfinished_stage_is_not_reported
    roster = stages(workflow("e2e-build-swift-ios", status: "running"))

    assert_empty roster.failed
    assert_empty roster.not_executed
  end

  def test_stage_without_external_id_did_not_execute
    roster = stages(workflow("e2e-execute-browserstack-run", status: "", external_id: ""))

    assert_equal ["e2e-execute-browserstack-run"], roster.not_executed.map(&:name)
    assert_empty roster.failed
  end

  def test_parallel_copies_collapse_into_one_stage
    roster = stages(
      workflow("e2e-execute-browserstack-run", external_id: ""),
      workflow("e2e-execute-browserstack-run_1", status: "failed"),
      workflow("e2e-execute-browserstack-run_2")
    )

    assert_equal ["e2e-execute-browserstack-run"], roster.failed.map(&:name)
    assert_equal "https://app.bitrise.io/app/#{APP_SLUG}/build/build-e2e-execute-browserstack-run_1",
      roster.failed.first.build_url
    assert_empty roster.not_executed
  end

  def test_report_stage_is_excluded
    roster = stages(workflow("e2e-report", status: "failed"))

    assert_empty roster.failed
  end

  def test_stage_without_app_slug_has_no_build_url
    roster = BitrisePipelineStages.from_json(
      JSON.generate([workflow("e2e-build-swift-ios", status: "failed")]),
      app_slug: nil
    )

    assert_nil roster.failed.first.build_url
  end

  def test_real_bitrise_payload_names_only_the_stage_that_failed
    roster = BitrisePipelineStages.from_json(<<~JSON, app_slug: APP_SLUG)
      [{"credit_cost":0,"depends_on":["e2e-produce-browserstack-run-plan"],
        "external_id":"d9a651a2","finished_at":"2026-07-29T11:17:44Z","id":"95f584ae",
        "is_generator":false,"name":"e2e-build-swift-ios","started_at":"2026-07-29T11:16:17Z",
        "status":{"Name":"succeeded","StatusLevel":5}},
       {"credit_cost":0,"depends_on":["e2e-produce-browserstack-run-plan"],
        "external_id":"5c4231d8","finished_at":"2026-07-29T11:17:23Z","id":"a9386fa1",
        "is_generator":false,"name":"e2e-build-react-native-ios","started_at":"2026-07-29T11:16:33Z",
        "status":{"Name":"failed","StatusLevel":5}}]
    JSON

    assert_equal ["e2e-build-react-native-ios"], roster.failed.map(&:name)
    assert_empty roster.not_executed
  end

  def test_plain_string_status_is_still_read
    roster = BitrisePipelineStages.from_json(
      JSON.generate([
        {"name" => "e2e-build-swift-ios", "status" => "succeeded", "external_id" => "d9a651a2"},
        {"name" => "e2e-build-react-native-ios", "status" => "failed", "external_id" => "5c4231d8"}
      ]),
      app_slug: APP_SLUG
    )

    assert_equal ["e2e-build-react-native-ios"], roster.failed.map(&:name)
  end

  def test_unusable_payloads_produce_an_empty_roster
    [nil, "", "   ", "not json", "{}", "[[]]"].each do |payload|
      roster = BitrisePipelineStages.from_json(payload, app_slug: APP_SLUG)

      assert_empty roster.failed, payload.inspect
      assert_empty roster.not_executed, payload.inspect
    end
  end
end
