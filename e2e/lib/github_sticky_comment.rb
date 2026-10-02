# frozen_string_literal: true

require_relative "../../scripts/lib/json_http_client"

class GitHubStickyComment
  def initialize(repository:, pr_number:, token:, marker:)
    @repository = repository
    @pr_number = pr_number
    @token = token
    @marker = marker
  end

  def publish!(body)
    existing = issue_comments.find { |comment| comment.fetch("body", "").include?(@marker) }
    if existing
      client.patch_json("/repos/#{@repository}/issues/comments/#{existing.fetch("id")}", {body: body})
    else
      client.post_json("/repos/#{@repository}/issues/#{@pr_number}/comments", {body: body})
    end
  end

  private

  def issue_comments
    comments = []
    page = 1
    loop do
      batch = client.get("/repos/#{@repository}/issues/#{@pr_number}/comments?per_page=100&page=#{page}")
      break unless batch.is_a?(Array) && !batch.empty?

      comments.concat(batch)
      break if batch.length < 100

      page += 1
    end
    comments
  end

  def client
    @client ||= JsonHttpClient.new(host: "api.github.com", error_label: "GitHub", default_headers: {"Accept" => "application/vnd.github+json"}) do |request|
      raise "GitHub token is required" unless @token

      request["Authorization"] = "Bearer #{@token}"
    end
  end
end
