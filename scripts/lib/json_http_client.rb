# frozen_string_literal: true

require "json"
require "net/http"
require "openssl"

# Small JSON-over-HTTPS client shared by the BrowserStack executor and the
# GitHub reporter. Each caller supplies its host, an error label, default
# headers, and an authenticator block that stamps credentials onto the request.
# Callers that want transient-failure retries pass a retries count and a
# retryable predicate; the default is a single attempt with no retries.
class JsonHttpClient
  MAX_BACKOFF_SECONDS = 30
  OPEN_TIMEOUT_SECONDS = 10
  READ_TIMEOUT_SECONDS = 120
  RETRYABLE_EXCEPTIONS = [
    Net::OpenTimeout,
    Net::ReadTimeout,
    Errno::ECONNRESET,
    Errno::ECONNREFUSED,
    Errno::EHOSTUNREACH,
    Errno::ETIMEDOUT,
    SocketError,
    OpenSSL::SSL::SSLError,
    EOFError,
    IOError
  ].freeze

  def initialize(host:, error_label:, default_headers: {}, retries: 0, retryable: nil, &authenticator)
    @host = host
    @error_label = error_label
    @default_headers = default_headers
    @retries = retries
    @retryable = retryable
    @authenticator = authenticator
  end

  def get(path)
    execute(Net::HTTP::Get.new(path))
  end

  def post_json(path, body)
    execute(with_json_body(Net::HTTP::Post.new(path), body))
  end

  def patch_json(path, body)
    execute(with_json_body(Net::HTTP::Patch.new(path), body))
  end

  def execute(request)
    @default_headers.each { |name, value| request[name] = value }
    attempts = 0
    loop do
      attempts += 1
      @authenticator&.call(request)
      begin
        response = perform(request)
      rescue *RETRYABLE_EXCEPTIONS
        raise unless retry_allowed?(request, attempts)

        sleep(backoff_seconds(attempts))
        next
      end
      return parse_body(response) if response.is_a?(Net::HTTPSuccess)
      raise "#{@error_label} request failed #{response.code}: #{response.body.to_s[0, 500]}" unless retryable?(response) && retry_allowed?(request, attempts)

      sleep(backoff_seconds(attempts))
    end
  end

  private

  def perform(request)
    Net::HTTP.start(@host, 443, use_ssl: true, open_timeout: OPEN_TIMEOUT_SECONDS, read_timeout: READ_TIMEOUT_SECONDS) { |http| http.request(request) }
  end

  def retry_allowed?(request, attempts)
    idempotent_request?(request) && attempts <= @retries
  end

  def retryable?(response)
    @retryable&.call(response) || false
  end

  def idempotent_request?(request)
    request.is_a?(Net::HTTP::Get)
  end

  def backoff_seconds(attempt)
    [attempt, MAX_BACKOFF_SECONDS].min + rand
  end

  def parse_body(response)
    return {} if response.body.to_s.empty?

    JSON.parse(response.body)
  rescue JSON::ParserError
    raise "#{@error_label} request returned non-JSON response"
  end

  def with_json_body(request, body)
    request["Content-Type"] = "application/json"
    request.body = JSON.generate(body)
    request
  end
end
