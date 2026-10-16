# frozen_string_literal: true

require "digest"
require "json"
require "open3"
require "time"
require "uri"
require_relative "../../scripts/lib/json_http_client"

# Reuse only results published by Bitrise for this PR. Fingerprint the checked-out
# merge tree, not the PR diff: changes brought in from the base also need testing.
class E2EResultReuse
  VERSION = 1
  MAX_AGE = 24 * 60 * 60
  ENVIRONMENT_KEYS = %w[
    E2E_DEVICE_OVERRIDE E2E_IOS_DEVICE_OVERRIDE E2E_ANDROID_DEVICE_OVERRIDE
    E2E_MAESTRO_VERSION E2E_BROWSERSTACK_TEST_RETRIES E2E_BROWSERSTACK_TIMEOUT_SECONDS
  ].freeze

  def initialize(matrix:, repo_root:, repository:, pr_number:, sha:, token:, pipeline_config:, env: ENV, client: nil, now: Time.now)
    @matrix = matrix
    @repo_root = repo_root
    @repository = repository
    @pr_number = pr_number.to_s
    @sha = sha
    @env = env
    @now = now
    @pipeline_config = pipeline_config
    @client = client || JsonHttpClient.new(
      host: "api.github.com", error_label: "GitHub E2E reuse",
      default_headers: {"Accept" => "application/vnd.github+json"}
    ) do |request|
      raise "GitHub token is required" if token.to_s.empty?

      request["Authorization"] = "Bearer #{token}"
    end
  end

  def apply(runs)
    return [] if runs.empty?

    fingerprinted = fingerprint(runs)
    return fingerprinted unless @pr_number.match?(/\A[1-9]\d*\z/) && @env["E2E_FORCE_RUN"] != "true"

    previous = previous_results
    fingerprinted.map do |run|
      match = previous.find { |entry| reusable?(entry, run) }
      match ? run.merge("reused_result" => match) : run
    end
  rescue StandardError => error
    # Reuse is an optimization. API, history, or metadata failures must run tests.
    warn "Unable to reuse E2E results (#{error.class}); running selected targets"
    fingerprinted || runs
  end

  def fingerprint(runs)
    tree, error, status = Open3.capture3("git", "ls-tree", "-rz", "HEAD", "--", ".", chdir: @repo_root)
    raise "Cannot read E2E input tree: #{error}" unless status.success?

    entries = tree.split("\0").sort
    environment = ENVIRONMENT_KEYS.to_h { |key| [key, @env[key]] }
    # Bitrise resolves the pipeline graph from the branch, before merging the base.
    graph = Digest::SHA256.file(@pipeline_config).hexdigest
    runs.map do |run|
      inputs = entries.select do |entry|
        @matrix.input_file?(run.fetch("application_id"), entry.split("\t", 2).fetch(1))
      end
      digest = Digest::SHA256.hexdigest(JSON.generate([VERSION, inputs, run, environment, graph]))
      run.merge("input_fingerprint" => digest)
    end
  end

  private

  def previous_results
    candidate_commits.each do |sha|
      query = URI.encode_www_form(check_name: "Checkout Kit E2E", filter: "latest", per_page: 100)
      response = @client.get("/repos/#{@repository}/commits/#{sha}/check-runs?#{query}")
      check = response.fetch("check_runs").select do |candidate|
        candidate["name"] == "Checkout Kit E2E" && candidate["head_sha"] == sha && candidate.dig("app", "slug") == "bitrise"
      end.max_by { |candidate| candidate.fetch("id") }
      next unless check

      # A newer failed/pending report must not fall back to an older green report.
      return [] unless check["status"] == "completed" && %w[success failure].include?(check["conclusion"])

      manifest = JSON.parse(check.dig("output", "text").to_s)
      return [] unless manifest["version"] == VERSION && manifest["pr_number"].to_s == @pr_number

      return manifest.fetch("runs")
    end
    []
  end

  def candidate_commits
    commits = []
    # GitHub caps PR commit listings at 250. If this head is absent (including a
    # force-push while the planner runs), there is no safe predecessor to reuse.
    1.upto(3) do |page|
      batch = @client.get("/repos/#{@repository}/pulls/#{@pr_number}/commits?per_page=100&page=#{page}")
      commits.concat(batch.map { |commit| commit.fetch("sha") })
      index = commits.index(@sha)
      return [commits[index], (commits[index - 1] if index.positive?)].compact if index
      break if batch.length < 100
    end
    []
  end

  def reusable?(entry, run)
    return false unless entry["id"] == run["id"] && entry["fingerprint"] == run["input_fingerprint"]
    return false unless entry["source_sha"].to_s.match?(/\A[0-9a-f]{40}\z/) && !entry["source_url"].to_s.empty?

    age = @now - Time.iso8601(entry.fetch("passed_at"))
    age >= 0 && age <= MAX_AGE
  rescue ArgumentError, KeyError
    false
  end
end
