# frozen_string_literal: true

require "minitest/autorun"
require "time"
require_relative "../tophat/build_state"

class TophatBuildStateTest < Minitest::Test
  HEAD_SHA = "a" * 40
  OLDER_SHA = "b" * 40
  NOW = Time.parse("2026-07-15T12:00:00Z")

  def build(status: TophatBuildState::SUCCESS_STATUS, commit_hash: HEAD_SHA, slug: "slug-1", **extra)
    {"status" => status, "commit_hash" => commit_hash, "slug" => slug}.merge(extra.transform_keys(&:to_s))
  end

  def running_build(**overrides)
    build(status: TophatBuildState::RUNNING_STATUS, **overrides)
  end

  def evaluation(head: nil, head_ready: false, current: nil, installable: nil, workflow: "workflow")
    TophatBuildState::Evaluation.new(
      workflow: workflow, head: head, head_ready: head_ready, current: current, installable: installable
    )
  end

  def head_ready_eval
    ready = build
    evaluation(head: ready, head_ready: true, current: ready, installable: ready)
  end

  def head_running_eval
    evaluation(head: running_build)
  end

  def stale_ready_eval
    older = build(commit_hash: OLDER_SHA)
    evaluation(current: older, installable: older)
  end

  def stale_running_eval
    evaluation(current: running_build(commit_hash: OLDER_SHA))
  end

  def failed_eval
    evaluation(current: build(status: 2, commit_hash: OLDER_SHA))
  end

  def none_eval
    evaluation
  end

  def test_head_build_matches_commit_hash
    match = build(commit_hash: HEAD_SHA, slug: "match")
    other = build(commit_hash: OLDER_SHA, slug: "other")
    assert_equal match, TophatBuildState.head_build([other, match], HEAD_SHA)
  end

  def test_head_build_returns_nil_when_absent
    assert_nil TophatBuildState.head_build([build(commit_hash: OLDER_SHA)], HEAD_SHA)
  end

  def test_workflow_state_head_ready
    assert_equal :head_ready, TophatBuildState.workflow_state(head_ready_eval)
  end

  def test_workflow_state_head_running
    assert_equal :head_running, TophatBuildState.workflow_state(head_running_eval)
  end

  def test_workflow_state_failed_when_head_finished_without_artifact
    assert_equal :failed, TophatBuildState.workflow_state(evaluation(head: build, head_ready: false))
  end

  def test_workflow_state_none_without_builds
    assert_equal :none, TophatBuildState.workflow_state(none_eval)
  end

  def test_workflow_state_stale_running
    assert_equal :stale_running, TophatBuildState.workflow_state(stale_running_eval)
  end

  def test_workflow_state_stale_ready
    assert_equal :stale_ready, TophatBuildState.workflow_state(stale_ready_eval)
  end

  def test_workflow_state_failed_when_current_has_no_installable
    assert_equal :failed, TophatBuildState.workflow_state(failed_eval)
  end

  def test_combine_all_head_ready
    assert_equal :head_ready, TophatBuildState.combine([head_ready_eval, head_ready_eval])
  end

  def test_combine_head_running_takes_precedence_over_ready
    assert_equal :head_running, TophatBuildState.combine([head_ready_eval, head_running_eval])
  end

  def test_combine_failed_takes_precedence_over_stale
    assert_equal :failed, TophatBuildState.combine([failed_eval, stale_ready_eval])
  end

  def test_combine_all_stale_ready
    assert_equal :stale_ready, TophatBuildState.combine([stale_ready_eval, stale_ready_eval])
  end

  def test_combine_stale_running
    assert_equal :stale_running, TophatBuildState.combine([stale_ready_eval, stale_running_eval])
  end

  def test_combine_none_for_mixed_ready_states
    assert_equal :none, TophatBuildState.combine([head_ready_eval, stale_ready_eval])
  end

  def test_combine_empty_is_head_ready
    assert_equal :head_ready, TophatBuildState.combine([])
  end

  def test_installable_available_true_when_all_present
    assert TophatBuildState.installable_available?([stale_ready_eval, head_ready_eval])
  end

  def test_installable_available_false_when_any_missing
    refute TophatBuildState.installable_available?([stale_ready_eval, none_eval])
  end

  def test_running_head_builds_selects_running_and_dedups_by_slug
    evaluations = [
      evaluation(head: running_build(slug: "a", build_number: 1)),
      evaluation(head: running_build(slug: "a", build_number: 1)),
      evaluation(head: running_build(slug: "b", build_number: 2)),
      evaluation(head: build(slug: "c")),
      none_eval
    ]
    slugs = TophatBuildState.running_head_builds(evaluations).map { |build| build.fetch("slug") }
    assert_equal ["a", "b"], slugs
  end

  def test_menu_choices_head_running_offers_wait
    assert_equal %i[wait_head install_current cancel],
      TophatBuildState.menu_choices(state: :head_running, installable_available: true)
  end

  def test_menu_choices_other_states_offer_trigger
    assert_equal %i[trigger_head install_current cancel],
      TophatBuildState.menu_choices(state: :stale_ready, installable_available: true)
  end

  def test_menu_choices_omits_install_when_unavailable
    assert_equal %i[trigger_head cancel],
      TophatBuildState.menu_choices(state: :failed, installable_available: false)
  end

  def test_short_sha_truncates_to_seven
    assert_equal "abcdef1", TophatBuildState.short_sha("abcdef1234567")
  end

  def test_short_sha_handles_nil
    assert_equal "", TophatBuildState.short_sha(nil)
  end

  def test_commit_title_takes_first_stripped_line
    assert_equal "feat: add wait", TophatBuildState.commit_title("feat: add wait\n\nbody text")
  end

  def test_commit_title_nil_for_blank_or_missing
    assert_nil TophatBuildState.commit_title(nil)
    assert_nil TophatBuildState.commit_title("   \n")
  end

  def test_commit_title_truncates_beyond_sixty_characters
    title = TophatBuildState.commit_title("x" * 80)
    assert_equal 60, title.length
    assert title.end_with?("...")
  end

  def test_commit_title_keeps_exactly_sixty_characters
    title = "y" * 60
    assert_equal title, TophatBuildState.commit_title(title)
  end

  def test_relative_age_minutes
    assert_equal "5m ago", TophatBuildState.relative_age({"finished_at" => "2026-07-15T11:55:00Z"}, now: NOW)
  end

  def test_relative_age_hours
    assert_equal "2h ago", TophatBuildState.relative_age({"finished_at" => "2026-07-15T10:00:00Z"}, now: NOW)
  end

  def test_relative_age_days
    assert_equal "3d ago", TophatBuildState.relative_age({"finished_at" => "2026-07-12T12:00:00Z"}, now: NOW)
  end

  def test_relative_age_just_now
    assert_equal "just now", TophatBuildState.relative_age({"triggered_at" => "2026-07-15T11:59:30Z"}, now: NOW)
  end

  def test_relative_age_prefers_finished_over_triggered
    stamps = {"finished_at" => "2026-07-15T11:00:00Z", "triggered_at" => "2026-07-15T09:00:00Z"}
    assert_equal "1h ago", TophatBuildState.relative_age(stamps, now: NOW)
  end

  def test_relative_age_nil_without_timestamps
    assert_nil TophatBuildState.relative_age({}, now: NOW)
  end

  def test_relative_age_nil_for_future_timestamp
    assert_nil TophatBuildState.relative_age({"finished_at" => "2026-07-15T13:00:00Z"}, now: NOW)
  end

  def test_relative_age_nil_for_unparseable_timestamp
    assert_nil TophatBuildState.relative_age({"finished_at" => "not-a-date"}, now: NOW)
  end

  def test_describe_build_joins_all_parts
    build = {
      "commit_hash" => "abcdef1234567",
      "commit_message" => "feat: add wait\n\nbody",
      "finished_at" => "2026-07-15T11:00:00Z"
    }
    assert_equal 'abcdef1 · "feat: add wait" · 3 behind · 1h ago',
      TophatBuildState.describe_build(build, now: NOW, behind_by: 3)
  end

  def test_describe_build_omits_behind_when_zero_or_nil
    build = {"commit_hash" => "abcdef1234567", "finished_at" => "2026-07-15T11:55:00Z"}
    assert_equal "abcdef1 · 5m ago", TophatBuildState.describe_build(build, now: NOW, behind_by: 0)
    assert_equal "abcdef1 · 5m ago", TophatBuildState.describe_build(build, now: NOW, behind_by: nil)
  end
end
