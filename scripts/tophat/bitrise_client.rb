# frozen_string_literal: true

require "json"
require "net/http"
require "uri"

class BitriseClient
  API_HOST = "api.bitrise.io"
  API_BASE = "/v0.1"

  def initialize(token:, app_slug:)
    @token = token
    @app_slug = app_slug
  end

  def authorized?
    get("#{API_BASE}/me").is_a?(Net::HTTPSuccess)
  end

  def latest_build(branch:, workflow:)
    query = URI.encode_www_form(branch: branch, workflow: workflow, limit: 1)
    get_json("#{API_BASE}/apps/#{@app_slug}/builds?#{query}").fetch("data", []).first
  end

  def artifact_titles(build_slug)
    path = "#{API_BASE}/apps/#{@app_slug}/builds/#{build_slug}/artifacts"
    get_json(path).fetch("data", []).map { |artifact| artifact.fetch("title") }
  end

  private

  def get_json(path)
    response = get(path)
    raise "Bitrise request failed #{response.code}: #{response.body}" unless response.is_a?(Net::HTTPSuccess)
    JSON.parse(response.body)
  end

  def get(path)
    request = Net::HTTP::Get.new(path)
    request["Authorization"] = @token
    Net::HTTP.start(API_HOST, 443, use_ssl: true) { |http| http.request(request) }
  end
end
