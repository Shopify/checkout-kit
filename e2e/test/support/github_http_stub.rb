# frozen_string_literal: true

require "json"
require_relative "../../../scripts/lib/json_http_client"

module GitHubHTTPStub
  def get(path)
    record_request("GET", path)
    page = Integer(path.split("page=").last)
    comments = JSON.parse(ENV.fetch("TEST_GITHUB_COMMENTS", "[]"))
    comments.slice((page - 1) * 100, 100) || []
  end

  def post_json(path, body)
    publish_comment("POST", path, body)
  end

  def patch_json(path, body)
    publish_comment("PATCH", path, body)
  end

  private

  def publish_comment(method, path, body)
    record_request(method, path, body)
    raise "GitHub request failed 503: unavailable" if ENV["TEST_GITHUB_PUBLISH_ERROR"] == "true"

    {"id" => 123}
  end

  def record_request(method, path, body = nil)
    File.open(ENV.fetch("TEST_GITHUB_REQUESTS"), "a") do |file|
      file.puts(JSON.generate({"method" => method, "path" => path, "body" => body}))
    end
  end
end

JsonHttpClient.prepend(GitHubHTTPStub)
