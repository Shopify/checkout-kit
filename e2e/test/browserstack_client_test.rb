# frozen_string_literal: true

require "minitest/autorun"
require_relative "../lib/browserstack_client"

class BrowserStackClientTest < Minitest::Test
  def test_build_url_appends_build_id
    assert_equal "https://app-automate.browserstack.com/dashboard/v2/builds/abc123", BrowserStackClient.build_url("abc123")
  end

  def test_build_url_without_build_id_returns_dashboard_base
    assert_equal "https://app-automate.browserstack.com/dashboard/v2/builds", BrowserStackClient.build_url(nil)
    assert_equal "https://app-automate.browserstack.com/dashboard/v2/builds", BrowserStackClient.build_url("")
  end
end
