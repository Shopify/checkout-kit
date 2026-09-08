# frozen_string_literal: true

require "minitest/autorun"
require_relative "../lib/github_token"

class GitHubTokenTest < Minitest::Test
  def test_override_token_takes_precedence
    token = GitHubToken.resolve(
      "OVERRIDE_GITHUB_TOKEN" => "override-token",
      "GIT_HTTP_PASSWORD" => "bitrise-token",
      "GITHUB_TOKEN" => "shared-token"
    )

    assert_equal "override-token", token
  end

  def test_bitrise_token_is_used_when_override_is_missing
    token = GitHubToken.resolve(
      "GIT_HTTP_PASSWORD" => "bitrise-token",
      "GITHUB_TOKEN" => "shared-token"
    )

    assert_equal "bitrise-token", token
  end

  def test_blank_override_falls_back_to_bitrise_token
    token = GitHubToken.resolve(
      "OVERRIDE_GITHUB_TOKEN" => " ",
      "GIT_HTTP_PASSWORD" => "bitrise-token"
    )

    assert_equal "bitrise-token", token
  end

  def test_shared_github_token_is_ignored
    token = GitHubToken.resolve("GITHUB_TOKEN" => "shared-token")

    assert_nil token
  end
end
