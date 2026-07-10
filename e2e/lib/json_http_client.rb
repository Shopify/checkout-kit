# frozen_string_literal: true

require "json"
require "net/http"

# Small JSON-over-HTTPS client shared by the BrowserStack executor and the
# GitHub reporter. Each caller supplies its host, an error label, default
# headers, and an authenticator block that stamps credentials onto the request.
class JsonHttpClient
  def initialize(host:, error_label:, default_headers: {}, &authenticator)
    @host = host
    @error_label = error_label
    @default_headers = default_headers
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
    @authenticator&.call(request)
    response = Net::HTTP.start(@host, 443, use_ssl: true) { |http| http.request(request) }
    body = response.body.to_s.empty? ? {} : JSON.parse(response.body)
    return body if response.is_a?(Net::HTTPSuccess)

    raise "#{@error_label} request failed #{response.code}: #{body}"
  end

  private

  def with_json_body(request, body)
    request["Content-Type"] = "application/json"
    request.body = JSON.generate(body)
    request
  end
end
