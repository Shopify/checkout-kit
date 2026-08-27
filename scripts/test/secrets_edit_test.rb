# frozen_string_literal: true

require "minitest/autorun"
require "fileutils"
require "json"
require "open3"
require "tmpdir"
require_relative "../lib/ejson_secrets"

# Exercises scripts/secrets_edit end to end against a throwaway keypair, so the
# test never needs the repository's own private key.
class SecretsEditTest < Minitest::Test
  REPO_ROOT = File.expand_path("../..", __dir__)
  SCRIPT = File.join(REPO_ROOT, "scripts", "secrets_edit")

  def setup
    skip "ejson is not installed" unless system("command -v ejson >/dev/null 2>&1")

    @dir = Dir.mktmpdir
    @keydir = File.join(@dir, "keys")
    Dir.mkdir(@keydir)
    @public_key = generate_keypair
    @path = File.join(@dir, "demo.ejson")
    write_encrypted("STOREFRONT_DOMAIN" => "shop.example.com", "API_VERSION" => "2026-07", "BLANK" => "")
  end

  def teardown
    FileUtils.remove_entry(@dir) if @dir && File.exist?(@dir)
  end

  def test_editing_one_value_stores_the_new_value
    edit(%w[API_VERSION=2026-10])

    assert_equal "2026-10", decrypt.fetch("API_VERSION")
  end

  def test_the_file_stays_fully_encrypted
    edit(%w[API_VERSION=2026-10])

    assert_empty EjsonSecrets.plaintext_violations(@path)
  end

  def test_untouched_values_keep_byte_identical_ciphertext
    before = ciphertext
    edit(%w[API_VERSION=2026-10])
    after = ciphertext

    assert_equal before.fetch("STOREFRONT_DOMAIN"), after.fetch("STOREFRONT_DOMAIN")
    refute_equal before.fetch("API_VERSION"), after.fetch("API_VERSION")
  end

  def test_filling_a_blank_value_works
    edit(%w[BLANK=now-set])

    assert_equal "now-set", decrypt.fetch("BLANK")
  end

  def test_saving_without_a_change_leaves_the_file_byte_identical
    before = File.read(@path)
    edit([])

    assert_equal before, File.read(@path)
  end

  def test_saving_without_a_change_says_so
    _out, status = edit([])

    assert_equal 0, status
  end

  def test_the_changed_key_is_reported_by_name
    out, = edit(%w[API_VERSION=2026-10])

    assert_includes out, "API_VERSION"
  end

  def test_the_new_value_is_never_printed
    out, = edit(%w[STOREFRONT_ACCESS_TOKEN=shpat_notarealtoken])

    refute_includes out, "shpat_notarealtoken"
  end

  def test_an_editor_that_fails_leaves_the_file_untouched
    before = File.read(@path)
    _out, status = run_script(editor: exiting_editor)

    assert_equal 1, status
    assert_equal before, File.read(@path)
  end

  def test_invalid_json_leaves_the_file_untouched
    before = File.read(@path)
    out, status = run_script(editor: corrupting_editor)

    assert_equal 1, status
    assert_equal before, File.read(@path)
    assert_includes out, "JSON"
  end

  def test_no_plaintext_survives_on_disk
    edit(%w[API_VERSION=2026-10])
    edited_path = File.read(File.join(@dir, "editor_argv")).strip

    refute_path_exists edited_path
  end

  def test_help_lists_every_available_file_by_name
    out, status = run_bare("--help")

    assert_equal 0, status
    assert_includes out, "demo"
    assert_includes out, "e2e"
  end

  def test_help_describes_what_each_file_configures
    out, = run_bare("--help")

    assert_includes out, "sample apps"
    assert_includes out, "end-to-end"
  end

  def test_help_shows_the_usage_line
    out, = run_bare("--help")

    assert_includes out, "dev secrets edit"
  end

  def test_no_arguments_shows_the_same_help_and_fails
    out, status = run_bare

    assert_equal 1, status
    assert_includes out, "demo"
    assert_includes out, "e2e"
  end

  def test_edit_without_a_name_lists_the_choices
    out, status = run_bare("edit")

    assert_equal 1, status
    assert_includes out, "demo"
    assert_includes out, "e2e"
  end

  def test_an_unknown_subcommand_names_itself_and_shows_help
    out, status = run_bare("delete", "demo")

    assert_equal 1, status
    assert_includes out, "delete"
    assert_includes out, "dev secrets edit"
  end

  def test_editing_a_secrets_file_regenerates_the_env_files
    skip "ejson2env is not installed" unless system("command -v ejson2env >/dev/null 2>&1")

    root = fake_repo_root
    out, status = run_in(root, %w[API_VERSION=2026-10])

    assert_equal 0, status, "secrets_edit failed:\n#{out}"
    assert_includes File.read(File.join(root, ".env")), "API_VERSION=2026-10"
  end

  def test_editing_a_file_outside_config_secrets_leaves_the_env_files_alone
    out, = edit(%w[API_VERSION=2026-10])

    refute_includes out, "generate_env_files"
    refute_path_exists File.join(@dir, ".env")
  end

  def test_an_unknown_name_is_rejected
    out, status = run_script(editor: setting_editor([]), target: "nope")

    assert_equal 1, status
    assert_includes out, "nope"
  end

  def test_a_missing_file_is_rejected
    out, status = run_script(editor: setting_editor([]), target: File.join(@dir, "absent.ejson"))

    assert_equal 1, status
    assert_includes out, "absent.ejson"
  end

  def test_a_missing_private_key_names_the_command_that_installs_it
    out, status = run_script(editor: setting_editor([]), keydir: empty_keydir)

    assert_equal 1, status
    assert_includes out, "dev ejson persist-keypair"
  end

  def test_changing_the_public_key_is_rejected
    before = File.read(@path)
    out, status = run_script(editor: rekeying_editor)

    assert_equal 1, status
    assert_equal before, File.read(@path)
    assert_includes out, "_public_key"
    assert_includes out, "cannot be changed"
  end

  private

  def edit(assignments)
    out, status = run_script(editor: setting_editor(assignments))
    assert_equal 0, status, "secrets_edit failed:\n#{out}"
    [out, status]
  end

  def run_bare(*args)
    out, status = Open3.capture2e({"NO_COLOR" => "1"}, SCRIPT, *args, chdir: REPO_ROOT)
    [out, status.exitstatus]
  end

  def run_script(editor:, target: @path, keydir: @keydir)
    env = {"EJSON_KEYDIR" => keydir, "EDITOR" => editor, "NO_COLOR" => "1"}
    out, status = Open3.capture2e(env, SCRIPT, "edit", target, chdir: REPO_ROOT)
    [out, status.exitstatus]
  end

  def fake_repo_root
    root = File.join(@dir, "repo")
    FileUtils.mkdir_p(File.join(root, "scripts"))
    FileUtils.mkdir_p(File.join(root, "config", "secrets"))

    FileUtils.cp(SCRIPT, File.join(root, "scripts"))
    FileUtils.cp(File.join(REPO_ROOT, "scripts", "generate_env_files"), File.join(root, "scripts"))
    FileUtils.cp_r(File.join(REPO_ROOT, "scripts", "lib"), File.join(root, "scripts"))
    FileUtils.cp(@path, File.join(root, "config", "secrets", "demo.ejson"))

    root
  end

  def run_in(root, assignments)
    env = {"EJSON_KEYDIR" => @keydir, "EDITOR" => setting_editor(assignments), "NO_COLOR" => "1"}
    target = File.join(root, "config", "secrets", "demo.ejson")
    out, status = Open3.capture2e(env, File.join(root, "scripts", "secrets_edit"), "edit", target, chdir: root)
    [out, status.exitstatus]
  end

  def setting_editor(assignments)
    fake_editor(<<~RUBY)
      values = #{assignments.inspect}.to_h { |pair| pair.split("=", 2) }
      document = JSON.parse(File.read(path))
      document["environment"].merge!(values)
      File.write(path, JSON.pretty_generate(document))
    RUBY
  end

  def exiting_editor
    fake_editor("exit 3")
  end

  def corrupting_editor
    fake_editor('File.write(path, "{ not json")')
  end

  def rekeying_editor
    fake_editor(<<~RUBY)
      document = JSON.parse(File.read(path))
      document["_public_key"] = "0" * 64
      File.write(path, JSON.pretty_generate(document))
    RUBY
  end

  def empty_keydir
    File.join(@dir, "empty-keys").tap { |path| Dir.mkdir(path) }
  end

  def fake_editor(body)
    path = File.join(@dir, "editor_#{body.hash.abs}")
    File.write(path, <<~RUBY)
      #!/usr/bin/env ruby
      require "json"
      path = ARGV.fetch(0)
      File.write(#{File.join(@dir, "editor_argv").inspect}, path)
      #{body}
    RUBY
    File.chmod(0o755, path)
    path
  end

  def generate_keypair
    out, status = Open3.capture2e({"EJSON_KEYDIR" => @keydir}, "ejson", "keygen", "--write")
    raise "keygen failed: #{out}" unless status.success?

    out.strip.split.last
  end

  def write_encrypted(environment)
    File.write(@path, JSON.pretty_generate("_public_key" => @public_key, "environment" => environment))
    out, status = Open3.capture2e("ejson", "encrypt", @path)
    raise "encrypt failed: #{out}" unless status.success?
  end

  def decrypt
    out, status = Open3.capture2e({"EJSON_KEYDIR" => @keydir}, "ejson", "decrypt", @path)
    raise "decrypt failed: #{out}" unless status.success?

    JSON.parse(out).fetch("environment")
  end

  def ciphertext
    JSON.parse(File.read(@path)).fetch("environment")
  end
end
