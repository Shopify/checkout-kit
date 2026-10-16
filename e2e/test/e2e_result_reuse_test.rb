# frozen_string_literal: true

require "minitest/autorun"
require "tmpdir"
require "fileutils"
require_relative "../lib/e2e_result_reuse"
require_relative "../lib/e2e_matrix_to_browserstack_run_plan"

class E2EResultReuseTest < Minitest::Test
  MATRIX_PATH = File.expand_path("../config/matrix.yml", __dir__)
  PREVIOUS_SHA = "a" * 40
  CURRENT_SHA = "b" * 40
  NOW = Time.utc(2026, 10, 16, 12)

  class Client
    attr_accessor :commits, :checks, :error
    attr_reader :paths

    def initialize
      @commits = [PREVIOUS_SHA, CURRENT_SHA]
      @checks = {}
      @paths = []
    end

    def get(path)
      @paths << path
      raise @error if @error

      if path.include?("/pulls/123/commits?")
        page = URI.decode_www_form(URI.parse(path).query).to_h.fetch("page").to_i
        @commits.slice((page - 1) * 100, 100).to_a.map { |sha| {"sha" => sha} }
      else
        sha = path.split("/commits/").last.split("/").first
        {"check_runs" => @checks.fetch(sha, [])}
      end
    end
  end

  def setup
    @root = Dir.mktmpdir("e2e-reuse")
    git("init", "-q")
    %w[
      platforms/swift/Sources/Checkout.swift
      platforms/android/src/Checkout.kt
      platforms/react-native/src/Checkout.ts
      platforms/swift/Samples/Package.resolved
      scripts/setup_storefront_env
      config/secrets/e2e.ejson
      e2e/tests/checkout.yaml
      e2e/bitrise.yml
      Package.swift
      .ci/changed-file-filters.yml
    ].each { |path| write(path, "synthetic input\n") }
    commit
    @matrix = E2EMatrixToBrowserStackRunPlan.load(MATRIX_PATH)
    @runs = @matrix.expand
    @client = Client.new
    @previous = reuse.fingerprint(@runs).map do |run|
      {
        "id" => run.fetch("id"), "fingerprint" => run.fetch("input_fingerprint"),
        "passed_at" => (NOW - 60).iso8601, "source_sha" => PREVIOUS_SHA,
        "source_url" => "https://app.bitrise.io/app/example/pipelines/original"
      }
    end
    @client.checks[PREVIOUS_SHA] = [check]
  end

  def teardown
    FileUtils.remove_entry(@root)
  end

  def reuse(env: {}, pr_number: "123")
    E2EResultReuse.new(
      matrix: @matrix, repo_root: @root, repository: "example/repo", pr_number: pr_number,
      sha: CURRENT_SHA, token: "test-token", pipeline_config: File.join(@root, "e2e/bitrise.yml"),
      env: env, client: @client, now: NOW
    )
  end

  def check(entries: @previous, sha: PREVIOUS_SHA, id: 1, conclusion: "success", pr_number: 123)
    {
      "id" => id, "name" => "Checkout Kit E2E", "head_sha" => sha,
      "app" => {"slug" => "bitrise"}, "status" => "completed", "conclusion" => conclusion,
      "output" => {"text" => JSON.generate("version" => 1, "pr_number" => pr_number, "runs" => entries)}
    }
  end

  def git(*args)
    output, error, status = Open3.capture3("git", *args, chdir: @root)
    raise error unless status.success?

    output
  end

  def write(path, content)
    absolute = File.join(@root, path)
    FileUtils.mkdir_p(File.dirname(absolute))
    File.write(absolute, content)
  end

  def commit
    git("add", ".")
    git("-c", "user.name=Test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", "commit", "-qm", "Fixture")
  end

  def pending(runs = reuse.apply(@runs))
    runs.reject { |run| run["reused_result"] }.map { |run| run.fetch("application_id") }.sort
  end

  def test_documentation_only_commit_reuses_all_targets_and_skips_expensive_workflows
    write("platforms/swift/README.md", "Updated documentation")
    write("platforms/android/docs/example.kt", "Documentation example")
    commit

    runs = reuse.apply(@runs)

    assert_empty pending(runs)
    assert_equal @previous, runs.map { |run| run.fetch("reused_result") }
    env = @matrix.bitrise_env(runs: runs)
    assert_equal "4", env.fetch("E2E_BROWSERSTACK_RUN_PLAN_COUNT")
    assert_equal "1", env.fetch("E2E_BROWSERSTACK_RUN_PLAN_PARALLEL_COUNT")
    assert_equal "false", env.fetch("E2E_HAS_E2E_RUNS")
    assert env.select { |key, _| key.start_with?("E2E_BUILD_") }.values.all? { |value| value == "false" }
  end

  def test_android_change_reruns_android_without_rebuilding_swift_or_published_react_native_sdks
    write("platforms/android/src/Checkout.kt", "Changed API")
    commit

    runs = reuse.apply(@runs)

    assert_equal ["kotlin-android"], pending(runs)
    env = @matrix.bitrise_env(runs: runs)
    assert_equal "true", env.fetch("E2E_BUILD_KOTLIN_ANDROID")
    assert_equal "false", env.fetch("E2E_BUILD_SWIFT_IOS")
    assert_equal "1", env.fetch("E2E_BROWSERSTACK_RUN_PLAN_PARALLEL_COUNT")
  end

  def test_merge_tree_change_invalidates_a_result_even_when_the_pr_head_is_unchanged
    write("platforms/swift/Sources/Checkout.swift", "Change arriving from base branch")
    commit

    assert_equal ["swift-ios"], pending
  end

  def test_deletions_renames_and_executable_mode_changes_invalidate_results
    git("mv", "platforms/swift/Sources/Checkout.swift", "platforms/swift/Sources/Renamed.swift")
    commit
    assert_equal ["swift-ios"], pending

    FileUtils.rm(File.join(@root, "platforms/android/src/Checkout.kt"))
    commit
    assert_equal %w[kotlin-android swift-ios], pending

    File.chmod(0o755, File.join(@root, "platforms/react-native/src/Checkout.ts"))
    commit
    assert_equal %w[kotlin-android react-native-android react-native-ios swift-ios], pending
  end

  def test_dependency_pin_change_invalidates_its_target
    write("platforms/swift/Samples/Package.resolved", "New dependency pin")
    commit

    assert_equal ["swift-ios"], pending
  end

  def test_shared_scripts_storefront_configuration_suite_and_pipeline_changes_invalidate_all_targets
    %w[scripts/setup_storefront_env config/secrets/e2e.ejson e2e/tests/checkout.yaml e2e/bitrise.yml].each do |path|
      original = File.read(File.join(@root, path))
      write(path, "Changed input")
      commit
      assert_equal 4, pending.length, path
      write(path, original)
      commit
    end
  end

  def test_device_and_maestro_overrides_invalidate_results
    %w[E2E_DEVICE_OVERRIDE E2E_IOS_DEVICE_OVERRIDE E2E_ANDROID_DEVICE_OVERRIDE E2E_MAESTRO_VERSION].each do |key|
      assert_equal 4, pending(reuse(env: {key => "different"}).apply(@runs)).length, key
    end
  end

  def test_force_run_and_non_pr_builds_do_not_lookup_previous_checks
    assert_equal 4, pending(reuse(env: {"E2E_FORCE_RUN" => "true"}).apply(@runs)).length
    assert_equal 4, pending(reuse(pr_number: nil).apply(@runs)).length
    assert_empty @client.paths
  end

  def test_latest_report_only_reuses_its_passed_rows_even_if_other_rows_failed
    @client.checks[PREVIOUS_SHA] << check(entries: [@previous.last], id: 2, conclusion: "failure")

    assert_equal %w[kotlin-android react-native-android react-native-ios], pending
  end

  def test_failed_current_commit_does_not_fall_back_to_previous_success
    @client.checks[CURRENT_SHA] = [check(entries: [], sha: CURRENT_SHA, conclusion: "failure")]

    assert_equal 4, pending.length
    refute @client.paths.any? { |path| path.include?("/commits/#{PREVIOUS_SHA}/") }
  end

  def test_pending_or_cancelled_checks_do_not_reuse_older_passes
    %w[in_progress cancelled].each do |status|
      @client.checks[PREVIOUS_SHA] << check(id: 2).merge("status" => status)
      assert_equal 4, pending.length
      @client.checks[PREVIOUS_SHA].pop
    end
  end

  def test_checks_from_other_apps_heads_or_pull_requests_are_ignored
    [
      check.merge("app" => {"slug" => "another-app"}),
      check.merge("head_sha" => "c" * 40),
      check(pr_number: 456)
    ].each do |unrelated|
      @client.checks[PREVIOUS_SHA] = [unrelated]
      assert_equal 4, pending.length
    end
  end

  def test_expired_future_and_malformed_timestamps_are_not_reused
    [(NOW - E2EResultReuse::MAX_AGE - 1).iso8601, (NOW + 1).iso8601, "invalid"].each do |timestamp|
      @client.checks[PREVIOUS_SHA] = [check(entries: @previous.map { |entry| entry.merge("passed_at" => timestamp) })]
      assert_equal 4, pending.length
    end
  end

  def test_missing_or_malformed_metadata_and_api_failures_run_tests
    [nil, "not JSON", '{"version":999}'].each do |text|
      @client.checks[PREVIOUS_SHA] = [check.merge("output" => {"text" => text})]
      capture_io { assert_equal 4, pending.length }
    end
    @client.error = RuntimeError.new("Request failed")
    capture_io { assert_equal 4, pending.length }
  end

  def test_missing_head_after_force_push_runs_tests
    @client.commits = [PREVIOUS_SHA, "c" * 40]

    assert_equal 4, pending.length
    refute @client.paths.any? { |path| path.include?("/check-runs?") }
  end

  def test_paginates_pr_commits_to_find_the_exact_predecessor
    @client.commits = (1..100).map { |index| format("%040x", index) } + [PREVIOUS_SHA, CURRENT_SHA]

    assert_empty pending
    assert @client.paths.any? { |path| path.end_with?("page=2") }
  end

  def test_missing_git_tree_fails_open_without_publishing_a_fingerprint
    FileUtils.rm_rf(File.join(@root, ".git"))

    capture_io do
      runs = reuse.apply(@runs)
      assert_equal @runs, runs
      refute runs.any? { |run| run["input_fingerprint"] }
    end
  end
end
