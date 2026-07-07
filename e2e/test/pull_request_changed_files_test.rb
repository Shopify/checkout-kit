# frozen_string_literal: true

require "minitest/autorun"
require_relative "../lib/pull_request_changed_files"

class PullRequestChangedFilesTest < Minitest::Test
  class FakeClient
    attr_reader :paths

    def initialize(responses)
      @responses = responses.dup
      @paths = []
    end

    def get(path)
      @paths << path
      raise "no queued response" if @responses.empty?

      result = @responses.shift
      raise result if result.is_a?(Exception)

      result
    end
  end

  def build(responses)
    client = FakeClient.new(responses)
    subject = PullRequestChangedFiles.new(
      repository: "Shopify/checkout-kit",
      pull_request: "123",
      token: "test-token",
      client: client
    )
    [subject, client]
  end

  def files_page(*names)
    names.map { |name| {"filename" => name} }
  end

  def full_page
    files_page(*Array.new(100) { |index| "file#{index}.ts" })
  end

  def test_paginates_across_multiple_pages
    subject, client = build([full_page, files_page("last.ts")])

    filenames = subject.filenames

    assert_equal 101, filenames.length
    assert_equal "last.ts", filenames.last
    assert_equal 2, client.paths.length
  end

  def test_stops_on_empty_page
    subject, client = build([full_page, []])

    assert_equal 100, subject.filenames.length
    assert_equal 2, client.paths.length
  end

  def test_returns_single_short_page
    subject, client = build([files_page("only.ts")])

    assert_equal ["only.ts"], subject.filenames
    assert_equal 1, client.paths.length
  end

  def test_requests_expected_paths
    subject, client = build([full_page, files_page("last.ts")])

    subject.filenames

    assert_equal "/repos/Shopify/checkout-kit/pulls/123/files?per_page=100&page=1", client.paths[0]
    assert_equal "/repos/Shopify/checkout-kit/pulls/123/files?per_page=100&page=2", client.paths[1]
  end

  def test_propagates_client_errors
    subject, = build([RuntimeError.new("GitHub PR files request failed 503: unavailable")])

    error = assert_raises(RuntimeError) { subject.filenames }

    assert_match(/GitHub PR files request failed 503/, error.message)
  end
end
