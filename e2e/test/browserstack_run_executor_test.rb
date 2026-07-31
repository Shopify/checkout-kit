# frozen_string_literal: true

require "minitest/autorun"
require "tmpdir"
load File.expand_path("../scripts/execute_browserstack_run", __dir__)

class BrowserStackRunExecutorTest < Minitest::Test
  E2E_ROOT = File.expand_path("..", __dir__)

  RUN = {
    "include_tags" => %w[launch cart checkout account],
    "exclude_tags" => %w[flaky wip]
  }.freeze

  def with_version_file(contents)
    Dir.mktmpdir do |dir|
      path = File.join(dir, ".maestro-version")
      File.write(path, contents)
      yield path
    end
  end

  # A constant holding the version would pass an equality check against the real file while
  # still drifting from it. Reading a file that says something else proves the file is the
  # source, not a copy of it.
  def test_the_version_comes_out_of_the_pin_file
    with_version_file("1.2.3\n") do |path|
      assert_equal "1.2.3", BrowserStackRunExecutor.resolve_maestro_version({}, version_file: path)
    end
  end

  # The local CLI resolves through e2e/scripts/maestro_bin, which reads this same file. One
  # file means the version BrowserStack runs and the version a laptop runs cannot diverge.
  def test_the_default_pin_file_is_the_one_the_local_cli_reads
    assert_equal(
      File.read(File.join(E2E_ROOT, ".maestro-version")).strip,
      BrowserStackRunExecutor.resolve_maestro_version({})
    )
  end

  # Probing a second version needs to bypass the pin without editing a tracked file.
  def test_an_override_replaces_the_pinned_version
    with_version_file("2.4.0\n") do |path|
      version = BrowserStackRunExecutor.resolve_maestro_version(
        {"E2E_MAESTRO_VERSION" => "2.0.7"},
        version_file: path
      )

      assert_equal "2.0.7", version
    end
  end

  def test_a_blank_override_falls_back_to_the_pin_file
    with_version_file("2.4.0\n") do |path|
      version = BrowserStackRunExecutor.resolve_maestro_version(
        {"E2E_MAESTRO_VERSION" => "  "},
        version_file: path
      )

      assert_equal "2.4.0", version
    end
  end

  def test_account_credentials_present_keeps_both_lists
    tags = BrowserStackRunExecutor.resolve_tags(RUN, account_enabled: true)

    assert_equal %w[launch cart checkout account], tags.fetch(:includeTags)
    assert_equal %w[flaky wip], tags.fetch(:excludeTags)
  end

  def test_account_credentials_missing_drops_the_account_tag_from_the_include_list
    tags = BrowserStackRunExecutor.resolve_tags(RUN, account_enabled: false)

    assert_equal %w[launch cart checkout], tags.fetch(:includeTags)
    assert_equal %w[flaky wip account], tags.fetch(:excludeTags)
  end

  def test_account_credentials_missing_never_repeats_a_tag_across_both_lists
    tags = BrowserStackRunExecutor.resolve_tags(RUN, account_enabled: false)

    assert_empty(tags.fetch(:includeTags) & tags.fetch(:excludeTags))
  end

  def test_empty_include_list_still_excludes_the_account_tag
    run = {"include_tags" => [], "exclude_tags" => []}
    tags = BrowserStackRunExecutor.resolve_tags(run, account_enabled: false)

    assert_empty tags.fetch(:includeTags)
    assert_equal ["account"], tags.fetch(:excludeTags)
  end
end
