# frozen_string_literal: true

require "net/http"
require "securerandom"
require_relative "../../scripts/lib/json_http_client"

# BrowserStack App Automate API client. Owns endpoint paths, HTTP, and response
# parsing; callers assemble request payloads and orchestrate build lifecycles.
class BrowserStackClient
  API_HOST = "api-cloud.browserstack.com"

  def initialize(username:, access_key:, retries: 0)
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
end
