# frozen_string_literal: true

require "json"
require "net/http"
require "uri"

class PullRequestChangedFiles
  PER_PAGE = 100
  RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504].freeze
  RETRYABLE_EXCEPTIONS = [
    Net::OpenTimeout,
    Net::ReadTimeout,
    Errno::ECONNRESET,
    Errno::ECONNREFUSED,
    SocketError,
    Timeout::Error,
    EOFError
  ].freeze

  def initialize(repository:, pull_request:, token:, transport: nil, max_attempts: 3, sleeper: ->(seconds) { sleep(seconds) })
    @repository = repository
    @pull_request = pull_request
    @token = token
    @transport = transport || method(:default_transport)
    @max_attempts = max_attempts
    @sleeper = sleeper
  end

  def filenames
    names = []
    page = 1
    loop do
      files = fetch_page(page)
      break if files.empty?

      names.concat(files.map { |file| file.fetch("filename") })
      break if files.length < PER_PAGE

      page += 1
    end
    names
  end

  private

  def fetch_page(page)
    response = request_with_retry(page)
    raise "GitHub PR files request failed #{response.code}: #{response.body}" unless success?(response.code)

    response.body.to_s.empty? ? [] : JSON.parse(response.body)
  end

  def request_with_retry(page)
    attempt = 0
    loop do
      attempt += 1
      begin
        response = @transport.call(request_uri(page), request_headers)
      rescue *RETRYABLE_EXCEPTIONS
        raise if attempt >= @max_attempts

        @sleeper.call(backoff(attempt))
        next
      end

      return response unless retryable_status?(response.code)
      return response if attempt >= @max_attempts

      @sleeper.call(backoff(attempt))
    end
  end

  def default_transport(uri, headers)
    request = Net::HTTP::Get.new(uri)
    headers.each { |key, value| request[key] = value }
    Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |http| http.request(request) }
  end

  def request_uri(page)
    uri = URI("https://api.github.com/repos/#{@repository}/pulls/#{@pull_request}/files")
    uri.query = URI.encode_www_form(per_page: PER_PAGE, page: page)
    uri
  end

  def request_headers
    {
      "Accept" => "application/vnd.github+json",
      "Authorization" => "Bearer #{@token}"
    }
  end

  def success?(code)
    code.to_i.between?(200, 299)
  end

  def retryable_status?(code)
    RETRYABLE_STATUS_CODES.include?(code.to_i)
  end

  def backoff(attempt)
    2**(attempt - 1)
  end
end
