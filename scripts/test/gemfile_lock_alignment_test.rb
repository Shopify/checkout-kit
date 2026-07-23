# frozen_string_literal: true

require "minitest/autorun"
require_relative "../lib/gemfile_lock_alignment"

class GemfileLockAlignmentTest < Minitest::Test
  REPO_ROOT = File.expand_path("../..", __dir__)

  def build(ruby_version:, bundler_version:)
    <<~LOCK
      GEM
        remote: https://rubygems.org/
        specs:

      PLATFORMS
        ruby

      DEPENDENCIES
        cocoapods

      RUBY VERSION
         ruby #{ruby_version}

      BUNDLED WITH
         #{bundler_version}
    LOCK
  end

  def test_parses_locked_ruby_and_bundler_versions
    lock = GemfileLockAlignment.new("Gemfile.lock", build(ruby_version: "3.4.8p72", bundler_version: "2.6.9"))

    assert_equal "3.4.8", lock.locked_ruby_version
    assert_equal "2.6.9", lock.locked_bundler_version
  end

  def test_no_errors_when_ruby_and_bundler_match_defaults
    lock = GemfileLockAlignment.new("Gemfile.lock", build(ruby_version: "3.4.8p72", bundler_version: "2.6.9"))

    errors = lock.alignment_errors(expected_ruby_version: "3.4.8", expected_bundler_version: "2.6.9")

    assert_empty errors
  end

  def test_flags_ruby_version_mismatch
    lock = GemfileLockAlignment.new("sample/Gemfile.lock", build(ruby_version: "3.3.6p108", bundler_version: "2.6.9"))

    errors = lock.alignment_errors(expected_ruby_version: "3.4.8", expected_bundler_version: "2.6.9")

    assert_includes errors, "RUBY VERSION 3.3.6 does not match .ruby-version 3.4.8"
  end

  def test_flags_bundler_not_matching_ruby_default
    lock = GemfileLockAlignment.new("swift/Gemfile.lock", build(ruby_version: "3.4.8p72", bundler_version: "2.4.3"))

    errors = lock.alignment_errors(expected_ruby_version: "3.4.8", expected_bundler_version: "2.6.9")

    assert_includes errors, "BUNDLED WITH 2.4.3 does not match the Ruby's default Bundler 2.6.9"
  end

  def test_flags_missing_expected_ruby_version_separately
    lock = GemfileLockAlignment.new("sample/Gemfile.lock", build(ruby_version: "3.4.8p72", bundler_version: "2.6.9"))

    errors = lock.alignment_errors(expected_ruby_version: nil, expected_bundler_version: "2.6.9")

    assert_includes errors, "could not resolve a .ruby-version; the Ruby version must always be available"
  end

  def test_skips_ruby_version_when_lockfile_omits_it
    lock = GemfileLockAlignment.new("Gemfile.lock", <<~LOCK)
      PLATFORMS
        ruby

      BUNDLED WITH
         2.6.9
    LOCK

    assert_nil lock.locked_ruby_version
    assert_empty lock.alignment_errors(expected_ruby_version: "3.4.8", expected_bundler_version: "2.6.9")
  end

  def test_without_footer_removes_ruby_and_bundler_sections
    stripped = GemfileLockAlignment.without_footer(build(ruby_version: "3.3.6p108", bundler_version: "2.5.23"))

    refute_includes stripped, "RUBY VERSION"
    refute_includes stripped, "BUNDLED WITH"
    assert_includes stripped, "DEPENDENCIES"
    assert stripped.end_with?("cocoapods\n"), "expected trailing dependency to be preserved with newline"
  end

  def test_without_footer_removes_bundled_with_only_footer
    stripped = GemfileLockAlignment.without_footer(<<~LOCK)
      DEPENDENCIES
        cocoapods

      BUNDLED WITH
         2.4.3
    LOCK

    refute_includes stripped, "BUNDLED WITH"
    assert stripped.end_with?("cocoapods\n")
  end

  def test_default_bundler_version_is_the_rubys_default_gem
    version = GemfileLockAlignment.default_bundler_version

    refute_nil version, "expected Ruby to ship a default Bundler gem"
    matching = Gem::Specification.find_all_by_name("bundler").find { |spec| spec.version.to_s == version }
    assert matching.default_gem?, "expected #{version} to be the default Bundler gem"
  end

  def test_real_tracked_lockfiles_are_aligned
    expected_bundler = GemfileLockAlignment.default_bundler_version

    errors = GemfileLockAlignment.tracked_lockfiles(REPO_ROOT).flat_map do |path|
      expected_ruby = GemfileLockAlignment.expected_ruby_version(File.dirname(path))
      GemfileLockAlignment.load(path, base: REPO_ROOT).alignment_errors(
        expected_ruby_version: expected_ruby,
        expected_bundler_version: expected_bundler,
      ).map { |error| "#{path}: #{error}" }
    end

    assert_empty errors, "Gemfile.lock files diverged from .ruby-version / the Ruby's default Bundler:\n#{errors.join("\n")}"
  end
end
