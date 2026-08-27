# frozen_string_literal: true

require "fileutils"
require "minitest/autorun"
require "open3"
require "tmpdir"

class RunMaestroTest < Minitest::Test
  E2E_ROOT = File.expand_path("..", __dir__)
  SCRIPT = File.join(E2E_ROOT, "scripts", "run_maestro")
  MAESTRO_VERSION = File.read(File.join(E2E_ROOT, ".maestro-version")).strip

  # run_maestro resolves the pinned Maestro binary through maestro_bin. Put the stub
  # at that expected path so the test records the invocation without driving a device.
  #
  # run_maestro takes six positional arguments and the last one, the test namespace, is
  # mandatory. These cases only exercise tag filtering, so the helper pads the optional
  # tag arguments and supplies a namespace rather than repeating both at every call.
  DEFAULT_TEST_NAMESPACE = "swift"

  def run_script(*args)
    args = args.dup
    args << "" while args.length < 5
    args << DEFAULT_TEST_NAMESPACE while args.length < 6

    Dir.mktmpdir do |dir|
      args_file = File.join(dir, "maestro-args")
      maestro = File.join(dir, MAESTRO_VERSION, "bin", "maestro")
      FileUtils.mkdir_p(File.dirname(maestro))
      File.write(maestro, <<~SH)
        #!/usr/bin/env bash
        printf '%s\n' "$@" > "$MAESTRO_ARGS_FILE"
      SH
      FileUtils.chmod(0o755, maestro)

      env = {
        "MAESTRO_VERSIONS_ROOT" => dir,
        "MAESTRO_ARGS_FILE" => args_file,
        "E2E_CUSTOMER_ACCOUNT_EMAIL" => "maestro@example.com",
        "E2E_CUSTOMER_ACCOUNT_CODE" => "000000"
      }
      stdout, stderr, status = Open3.capture3(env, SCRIPT, *args)

      {
        stdout: stdout,
        stderr: stderr,
        status: status,
        maestro_args: File.exist?(args_file) ? File.readlines(args_file, chomp: true) : nil
      }
    end
  end

  def flag_value(args, flag)
    index = args.index(flag)
    index && args.fetch(index + 1)
  end

  def test_ios_excludes_android_only
    result = run_script("ios", "app.id", "ready")

    assert_predicate result.fetch(:status), :success?
    assert_equal "android-only", flag_value(result.fetch(:maestro_args), "--exclude-tags")
  end

  def test_android_excludes_ios_only
    result = run_script("android", "app.id", "ready")

    assert_predicate result.fetch(:status), :success?
    assert_equal "ios-only", flag_value(result.fetch(:maestro_args), "--exclude-tags")
  end

  def test_caller_exclusions_are_preserved
    result = run_script("ios", "app.id", "ready", "", "slow")

    assert_equal "slow,android-only", flag_value(result.fetch(:maestro_args), "--exclude-tags")
  end

  def test_mandatory_exclusion_is_not_duplicated
    result = run_script("android", "app.id", "ready", "", "ios-only")

    assert_equal "ios-only", flag_value(result.fetch(:maestro_args), "--exclude-tags")
  end

  def test_incompatible_tag_leaves_compatible_requested_tags
    result = run_script("android", "app.id", "ready", "ios-only,checkout")

    assert_predicate result.fetch(:status), :success?
    assert_equal "checkout", flag_value(result.fetch(:maestro_args), "--include-tags")
    assert_equal "ios-only", flag_value(result.fetch(:maestro_args), "--exclude-tags")
  end

  # Maestro treats an empty include list as "run everything". If the caller explicitly
  # requests only a capability this platform excludes, the runner must no-op instead.
  def test_incompatible_only_request_runs_nothing
    result = run_script("android", "app.id", "ready", "ios-only")

    assert_predicate result.fetch(:status), :success?
    assert_nil result.fetch(:maestro_args)
    assert_includes result.fetch(:stderr), "nothing runs"
  end

  def test_unknown_platform_fails_before_maestro
    result = run_script("windows", "app.id", "ready")

    refute_predicate result.fetch(:status), :success?
    assert_nil result.fetch(:maestro_args)
    assert_includes result.fetch(:stderr), "platform must be ios or android"
  end
end
