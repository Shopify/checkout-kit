# frozen_string_literal: true

require "minitest/autorun"
require "json"
require_relative "../lib/pull_request_changed_files"

class PullRequestChangedFilesTest < Minitest::Test
  Response = Struct.new(:code, :body)

  class FakeTransport
    attr_reader :calls

    def initialize(responses)
      @responses = responses.dup
      @calls = []
    end

    def call(uri, headers)
      @calls << {uri: uri, headers: headers}
      raise "no queued response" if @responses.empty?

      result = @responses.shift
      raise result if result.is_a?(Exception)

      result
    end
  end

  def build(responses, max_attempts: 3)
    transport = FakeTransport.new(responses)
    subject = PullRequestChangedFiles.new(
      repository: "Shopify/checkout-kit",
      pull_request: "123",
      token: "test-token",
      transport: transport,
      max_attempts: max_attempts,
      sleeper: ->(_seconds) {}
    )
    [subject, transport]
  end

  def files_body(*names)
    JSON.dump(names.map { |name| {"filename" => name} })
  end

  def full_page_body
    files_body(*Array.new(100) { |index| "file#{index}.ts" })
  end

  def test_paginates_across_multiple_pages
    subject, transport = build([
      Response.new(200, full_page_body),
      Response.new(200, files_body("last.ts"))
    ])

    filenames = subject.filenames

    assert_equal 101, filenames.length
    assert_equal "last.ts", filenames.last
    assert_equal 2, transport.calls.length
  end

  def test_stops_on_empty_page
    subject, transport = build([
      Response.new(200, full_page_body),
      Response.new(200, "[]")
    ])

    assert_equal 100, subject.filenames.length
    assert_equal 2, transport.calls.length
  end

  def test_returns_single_short_page
    subject, transport = build([Response.new(200, files_body("only.ts"))])

    assert_equal ["only.ts"], subject.filenames
    assert_equal 1, transport.calls.length
  end

  def test_retries_then_succeeds_on_server_error
    subject, transport = build([
      Response.new(500, "boom"),
      Response.new(200, files_body("a.ts"))
    ])

    assert_equal ["a.ts"], subject.filenames
    assert_equal 2, transport.calls.length
  end

  def test_retries_then_succeeds_on_transient_exception
    subject, transport = build([
      Errno::ECONNRESET.new("reset"),
      Response.new(200, files_body("a.ts"))
    ])

    assert_equal ["a.ts"], subject.filenames
    assert_equal 2, transport.calls.length
  end

  def test_raises_after_exhausting_retries_on_server_error
    subject, transport = build([
      Response.new(503, "unavailable"),
      Response.new(503, "unavailable"),
      Response.new(503, "unavailable")
    ], max_attempts: 3)

    error = assert_raises(RuntimeError) { subject.filenames }

    assert_match(/GitHub PR files request failed 503/, error.message)
    assert_equal 3, transport.calls.length
  end

  def test_raises_immediately_on_non_retryable_status
    subject, transport = build([Response.new(404, "not found")])

    error = assert_raises(RuntimeError) { subject.filenames }

    assert_match(/GitHub PR files request failed 404/, error.message)
    assert_equal 1, transport.calls.length
  end

  def test_sends_authorization_header_and_pagination_params
    subject, transport = build([Response.new(200, files_body("a.ts"))])

    subject.filenames
    call = transport.calls.first

    assert_equal "Bearer test-token", call[:headers]["Authorization"]
    assert_includes call[:uri].to_s, "per_page=100"
    assert_includes call[:uri].to_s, "page=1"
  end
end
