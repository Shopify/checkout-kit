# frozen_string_literal: true

require "minitest/autorun"
require_relative "../lib/browserstack_client"

class BrowserStackClientTest < Minitest::Test
  FakeHttpClient = Struct.new(:response, :path) do
    def get(request_path)
      self.path = request_path
      response
    end
  end

  def test_build_url_appends_build_id
    assert_equal "https://app-automate.browserstack.com/dashboard/v2/builds/abc123", BrowserStackClient.build_url("abc123")
  end

  def test_build_url_without_build_id_returns_dashboard_base
    assert_equal "https://app-automate.browserstack.com/dashboard/v2/builds", BrowserStackClient.build_url(nil)
    assert_equal "https://app-automate.browserstack.com/dashboard/v2/builds", BrowserStackClient.build_url("")
  end

  def test_standard_app_upload_uses_the_app_automate_endpoint
    client = BrowserStackClient.allocate
    client.define_singleton_method(:upload) do |path, file_path, custom_id|
      {"path" => path, "file_path" => file_path, "custom_id" => custom_id}
    end

    response = client.upload_app_automate_app("sample.ipa", "checkout-kit-ios-abc")

    assert_equal "/app-automate/upload", response.fetch("path")
    assert_equal "sample.ipa", response.fetch("file_path")
    assert_equal "checkout-kit-ios-abc", response.fetch("custom_id")
  end

  def test_find_build_by_name_returns_the_standard_app_automate_build
    http = FakeHttpClient.new([
      {"automation_build" => {"name" => "other", "hashed_id" => "first"}},
      {"automation_build" => {"name" => "checkout-kit maestro-runner 42", "hashed_id" => "wanted"}}
    ])
    client = BrowserStackClient.allocate
    client.instance_variable_set(:@client, http)

    build = client.find_build_by_name("checkout-kit maestro-runner 42")

    assert_equal "wanted", build.fetch("hashed_id")
    assert_equal "/automate/builds.json?limit=100", http.path
  end
end
