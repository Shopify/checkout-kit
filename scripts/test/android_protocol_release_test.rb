# frozen_string_literal: true

require "minitest/autorun"
require "fileutils"
require "open3"
require "tmpdir"
require "yaml"

class AndroidProtocolReleaseTest < Minitest::Test
  ROOT = File.expand_path("../..", __dir__)
  SCRIPT = File.join(ROOT, ".github/scripts/check-android-protocol-release")
  CATALOG = "platforms/android/gradle/libs.versions.toml"
  PROTOCOL = "protocol/languages/kotlin/embedded-checkout-protocol"
  VERSION = "2026.08.25.1-alpha.1"
  TAG = "embedded-checkout-protocol/#{VERSION}"
  GIT_ENV = {"GIT_CONFIG_NOSYSTEM" => "1", "GIT_CONFIG_GLOBAL" => File::NULL}.freeze

  def setup
    @repo = Dir.mktmpdir("android-protocol-release")
    git("init", "--quiet")
    git("config", "user.name", "Release Test")
    git("config", "user.email", "release-test@example.com")
    write(CATALOG, <<~TOML)
      [versions]
      checkoutKitAndroid = "4.0.0-alpha.8"
      embeddedCheckoutProtocolAndroid = "#{VERSION}"
    TOML
    write("#{PROTOCOL}/src/main/kotlin/Models.kt", "class Checkout\n")
    write("#{PROTOCOL}/build.gradle", "plugins { id 'java-library' }\n")
    write("platforms/android/gradle/android-library-versions.gradle", "ext.javaVersion = 11\n")
    FileUtils.mkdir_p(File.join(@repo, ".github/scripts"))
    FileUtils.cp(File.join(ROOT, ".github/scripts/validate-release-version"), File.join(@repo, ".github/scripts"))
    commit
    git("tag", TAG)
  end

  def teardown
    FileUtils.remove_entry(@repo)
  end

  def test_accepts_matching_protocol_with_unrelated_android_docs_and_test_changes
    write("platforms/android/lib/src/main/Checkout.kt", "class CheckoutKit\n")
    write("#{PROTOCOL}/README.md", "Updated installation instructions\n")
    write("#{PROTOCOL}/src/test/kotlin/ModelsTest.kt", "class ModelsTest\n")
    write(CATALOG, File.read(File.join(@repo, CATALOG)).sub("4.0.0-alpha.8", "4.0.0-alpha.9"))
    commit

    output, status = check
    assert status.success?, output
    assert_includes output, "match '#{TAG}'"
  end

  def test_rejects_runtime_changes_without_a_new_protocol_release
    write("#{PROTOCOL}/src/main/kotlin/Models.kt", "class Checkout\nclass Policy\n")
    commit

    output, status = check
    refute status.success?, output
    assert_includes output, "Bump embeddedCheckoutProtocolAndroid"
    assert_includes output, "Models.kt"
  end

  def test_rejects_added_and_deleted_runtime_files
    write("#{PROTOCOL}/src/main/kotlin/Policy.kt", "class Policy\n")
    File.delete(File.join(@repo, "#{PROTOCOL}/src/main/kotlin/Models.kt"))
    commit

    output, status = check
    refute status.success?, output
    assert_includes output, "Models.kt"
    assert_includes output, "Policy.kt"
  end

  def test_rejects_protocol_build_changes
    write("#{PROTOCOL}/build.gradle", "plugins { id 'java-library' }\nversion = 'changed'\n")
    commit

    output, status = check
    refute status.success?, output
    assert_includes output, "#{PROTOCOL}/build.gradle"
  end

  def test_rejects_shared_compatibility_changes
    write("platforms/android/gradle/android-library-versions.gradle", "ext.javaVersion = 17\n")
    commit

    output, status = check
    refute status.success?, output
    assert_includes output, "android-library-versions.gradle"
  end

  def test_bumping_version_requires_a_new_tag_with_matching_sources
    next_version = "2026.08.25.1-alpha.2"
    write(CATALOG, File.read(File.join(@repo, CATALOG)).sub(VERSION, next_version))
    write("#{PROTOCOL}/src/main/kotlin/Models.kt", "class Checkout\nclass Policy\n")
    commit

    output, status = check
    refute status.success?, output
    assert_includes output, "Required protocol release tag"

    git("tag", "-a", "embedded-checkout-protocol/#{next_version}", "-m", "Protocol release")
    output, status = check
    assert status.success?, output
  end

  def test_rejects_missing_tag_even_when_a_branch_has_the_same_name
    git("tag", "-d", TAG)
    git("branch", TAG)

    output, status = check
    refute status.success?, output
    assert_includes output, "Fetch release tags"
  end

  def test_rejects_tag_that_does_not_contain_protocol_sources
    git("tag", "-d", TAG)
    FileUtils.rm_rf(File.join(@repo, "#{PROTOCOL}/src/main"))
    commit
    git("tag", TAG)
    write("#{PROTOCOL}/src/main/kotlin/Models.kt", "class Checkout\n")
    commit

    output, status = check
    refute status.success?, output
    assert_includes output, "has no Kotlin runtime sources"
  end

  def test_rejects_invalid_protocol_version_before_comparison
    write(CATALOG, File.read(File.join(@repo, CATALOG)).sub(VERSION, "invalid"))

    output, status = check
    refute status.success?, output
    assert_includes output, "version 'invalid' is invalid"
  end

  def test_release_workflows_check_sources_before_external_mutations
    {
      "release.yml" => "gh release create",
      "android-publish.yml" => ":lib:publishReleasePublicationToOssrh-staging-apiRepository"
    }.each do |filename, mutation|
      workflow = YAML.safe_load_file(File.join(ROOT, ".github/workflows", filename), aliases: true)
      steps = workflow.fetch("jobs").values.first.fetch("steps")
      checkout = steps.find { |step| step.fetch("uses", "").start_with?("actions/checkout@") }
      assert_equal 0, checkout.dig("with", "fetch-depth"), filename
      guard_index = steps.index { |step| step.fetch("run", "").include?(".github/scripts/check-android-protocol-release") }
      mutation_index = steps.index { |step| step.fetch("run", "").include?(mutation) }
      refute_nil guard_index, filename
      refute_nil mutation_index, filename
      assert_operator guard_index, :<, mutation_index, filename
      if filename == "release.yml"
        assert_equal "steps.release.outputs.platform == 'android'", steps[guard_index]["if"]
      end
    end
  end

  private

  def write(path, content)
    full_path = File.join(@repo, path)
    FileUtils.mkdir_p(File.dirname(full_path))
    File.write(full_path, content)
  end

  def git(*args)
    output, status = Open3.capture2e(GIT_ENV, "git", "-C", @repo, *args)
    raise output unless status.success?

    output
  end

  def commit
    git("add", ".")
    git("commit", "--quiet", "-m", "Fixture")
  end

  def check
    Open3.capture2e(GIT_ENV, "bash", SCRIPT, chdir: @repo)
  end
end
