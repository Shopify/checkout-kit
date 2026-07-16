# frozen_string_literal: true

require "uri"
require_relative "../lib/json_http_client"

class BitriseClient
  API_HOST = "api.bitrise.io"
  API_BASE = "/v0.1"

  def initialize(token:, app_slug:)
    @app_slug = app_slug
    @transport = JsonHttpClient.new(host: API_HOST, error_label: "Bitrise") do |request|
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
    query = URI.encode_www_form(branch: branch, workflow: workflow, limit: 1)
    @transport.get("#{API_BASE}/apps/#{@app_slug}/builds?#{query}").fetch("data", []).first
  end

  def artifact_titles(build_slug)
    path = "#{API_BASE}/apps/#{@app_slug}/builds/#{build_slug}/artifacts"
    @transport.get(path).fetch("data", []).map { |artifact| artifact.fetch("title") }
  end
end
