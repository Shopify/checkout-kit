# frozen_string_literal: true

require_relative "../../scripts/lib/json_http_client"

class PullRequestChangedFiles
  PER_PAGE = 100
  RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504].freeze

  def initialize(repository:, pull_request:, token:, client: nil, max_attempts: 3)
    @repository = repository
    @pull_request = pull_request
    @client = client || default_client(token, max_attempts)
  end

  def filenames
    names = []
    page = 1
    loop do
      files = fetch_page(page)
      break unless files.is_a?(Array) && !files.empty?

      names.concat(files.map { |file| file.fetch("filename") })
      break if files.length < PER_PAGE

      page += 1
    end
    names
  end

  private

  def fetch_page(page)
    @client.get("/repos/#{@repository}/pulls/#{@pull_request}/files?per_page=#{PER_PAGE}&page=#{page}")
  end

  def default_client(token, max_attempts)
    JsonHttpClient.new(
      host: "api.github.com",
      error_label: "GitHub PR files",
      default_headers: {"Accept" => "application/vnd.github+json"},
      retries: max_attempts - 1,
      retryable: ->(response) { RETRYABLE_STATUS_CODES.include?(response.code.to_i) }
    ) do |request|
      raise "GitHub token is required" if token.to_s.empty?

      request["Authorization"] = "Bearer #{token}"
    end
  end
end
