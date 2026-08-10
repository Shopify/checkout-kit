# frozen_string_literal: true

require "net/http"
require "securerandom"
require "uri"
require_relative "../../scripts/lib/json_http_client"

# BrowserStack App Automate API client. Owns endpoint paths, HTTP, and response
# parsing; callers assemble request payloads and orchestrate build lifecycles.
class BrowserStackClient
  API_HOST = "api-cloud.browserstack.com"
  ARTIFACT_HOSTS = [API_HOST, "api.browserstack.com"].freeze
  DASHBOARD_BASE = "https://app-automate.browserstack.com/dashboard/v2/builds"

  def self.build_url(build_id)
    build_id.to_s.empty? ? DASHBOARD_BASE : "#{DASHBOARD_BASE}/#{build_id}"
  end

  def initialize(username:, access_key:, retries: 0)
    @username = username
    @access_key = access_key
    @client = JsonHttpClient.new(
      host: API_HOST,
      error_label: "BrowserStack",
      retries: retries,
      retryable: ->(response) { response.code.to_i == 429 || response.code.to_i >= 500 }
    ) do |request|
      request.basic_auth(username, access_key)
    end
  end

  def list_devices
    @client.get("/app-automate/devices.json")
  end

  def list_device_tier_limits
    @client.get("/app-automate/device_tier_limits.json")
  end

  def upload(path, file_path, custom_id)
    boundary = "----checkout-kit-#{SecureRandom.hex(12)}"
    file = File.binread(file_path)
    body = +""
    body << "--#{boundary}\r\n"
    body << "Content-Disposition: form-data; name=\"file\"; filename=\"#{File.basename(file_path)}\"\r\n\r\n"
    body << file
    body << "\r\n--#{boundary}\r\n"
    body << "Content-Disposition: form-data; name=\"custom_id\"\r\n\r\n"
    body << custom_id
    body << "\r\n--#{boundary}--\r\n"
    request = Net::HTTP::Post.new(path)
    request["Content-Type"] = "multipart/form-data; boundary=#{boundary}"
    request.body = body
    @client.execute(request)
  end

  def start_build(platform, body)
    @client.post_json("/app-automate/maestro/v2/#{platform}/build", body)
  end

  def get_build(build_id)
    @client.get("/app-automate/maestro/v2/builds/#{build_id}")
  end

  def stop_build(build_id)
    @client.post_json("/app-automate/maestro/builds/#{build_id}/stop", {})
  end

  def get_session(build_id, session_id)
    @client.get("/app-automate/maestro/v2/builds/#{build_id}/sessions/#{session_id}")
  end

  def get_artifact_text(url, redirects_remaining: 3)
    uri = URI.parse(url)
    unless uri.scheme == "https" && ARTIFACT_HOSTS.include?(uri.host)
      raise "BrowserStack artifact URL has an unexpected origin"
    end

    request = Net::HTTP::Get.new(uri)
    request.basic_auth(@username, @access_key)
    response = Net::HTTP.start(
      uri.host,
      uri.port,
      use_ssl: true,
      open_timeout: 10,
      read_timeout: 120
    ) { |http| http.request(request) }

    return response.body.to_s if response.is_a?(Net::HTTPSuccess)

    if response.is_a?(Net::HTTPRedirection) && redirects_remaining.positive?
      location = response["location"]
      raise "BrowserStack artifact redirect omitted Location" if location.to_s.empty?

      return get_artifact_text(URI.join(uri, location).to_s, redirects_remaining: redirects_remaining - 1)
    end

    raise "BrowserStack artifact request failed #{response.code}"
  end
end
