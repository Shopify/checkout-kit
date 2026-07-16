# frozen_string_literal: true

require "uri"
require_relative "../lib/json_http_client"

class BitriseClient
  API_HOST = "api.bitrise.io"
  API_BASE = "/v0.1"

  def initialize(token:, app_slug:, retries: 0)
    @app_slug = app_slug
    @transport = JsonHttpClient.new(
      host: API_HOST,
      error_label: "Bitrise",
      retries: retries,
      retryable: ->(response) { response.code.to_i == 429 || response.code.to_i >= 500 }
    ) do |request|
      request["Authorization"] = token
    end
  end

  def authorized?
    @transport.get("#{API_BASE}/me")
    true
  rescue RuntimeError
    false
  end

  def latest_build(branch:, workflow:)
    builds(branch: branch, workflow: workflow, limit: 1).first
  end

  def builds(branch:, workflow:, limit: 20)
    query = URI.encode_www_form(branch: branch, workflow: workflow, limit: limit)
    @transport.get("#{API_BASE}/apps/#{@app_slug}/builds?#{query}").fetch("data", [])
  end

  def build(build_slug)
    @transport.get("#{API_BASE}/apps/#{@app_slug}/builds/#{build_slug}").fetch("data")
  end

  def trigger_build(branch:, commit_hash:, workflow:)
    body = {
      hook_info: {type: "bitrise"},
      build_params: {branch: branch, commit_hash: commit_hash, workflow_id: workflow}
    }
    @transport.post_json("#{API_BASE}/apps/#{@app_slug}/builds", body)
  end

  def artifact_titles(build_slug)
    path = "#{API_BASE}/apps/#{@app_slug}/builds/#{build_slug}/artifacts"
    @transport.get(path).fetch("data", []).map { |artifact| artifact.fetch("title") }
  end
end
