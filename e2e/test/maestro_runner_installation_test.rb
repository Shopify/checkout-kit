# frozen_string_literal: true

require "minitest/autorun"
require "open3"
require "tmpdir"

class MaestroRunnerInstallationTest < Minitest::Test
  REPO_ROOT = File.expand_path("../..", __dir__)
  VERSION_FILE = File.join(REPO_ROOT, "e2e/.maestro-runner-version")
  CHECKSUMS_FILE = File.join(REPO_ROOT, "e2e/.maestro-runner-checksums")
  INSTALLER = File.join(REPO_ROOT, "scripts/install_maestro_runner")
  RESOLVER = File.join(REPO_ROOT, "e2e/scripts/maestro_runner_bin")

  def test_release_is_pinned_with_checksums_for_every_supported_worker
    version = File.read(VERSION_FILE).strip
    checksums = File.readlines(CHECKSUMS_FILE, chomp: true).to_h { |line| line.split(" ", 2).reverse }

    assert_equal "1.1.24", version
    %w[darwin-amd64 darwin-arm64 linux-amd64 linux-arm64].each do |platform|
      asset = "maestro-runner-#{version}-#{platform}.tar.gz"
      assert_match(/\A[0-9a-f]{64}\z/, checksums.fetch(asset))
    end
  end

  def test_resolver_returns_the_pinned_executable
    Dir.mktmpdir do |versions_root|
      version = File.read(VERSION_FILE).strip
      binary = File.join(versions_root, version, "maestro-runner")
      FileUtils.mkdir_p(File.dirname(binary))
      File.write(binary, "#!/bin/sh\nexit 0\n")
      File.chmod(0o755, binary)

      stdout, stderr, status = Open3.capture3({"MAESTRO_RUNNER_VERSIONS_ROOT" => versions_root}, RESOLVER)

      assert status.success?, stderr
      assert_equal "#{binary}\n", stdout
    end
  end
end
