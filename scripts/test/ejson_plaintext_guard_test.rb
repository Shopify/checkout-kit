# frozen_string_literal: true

require "minitest/autorun"
require "json"
require "tmpdir"
require_relative "../lib/ejson_secrets"

class EjsonPlaintextGuardTest < Minitest::Test
  ENCRYPTED = "EJ[1:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaA=:bbbb:cccc]"

  def test_fully_encrypted_file_has_no_violations
    path = write_ejson(
      "_public_key" => "e0f8b2c1",
      "environment" => {"STOREFRONT_DOMAIN" => ENCRYPTED, "API_VERSION" => ENCRYPTED},
    )

    assert_empty EjsonSecrets.plaintext_violations(path)
  end

  def test_bare_string_value_is_a_violation
    path = write_ejson("environment" => {"STOREFRONT_DOMAIN" => "leaked-store.example.com"})

    assert_equal ["environment.STOREFRONT_DOMAIN"], EjsonSecrets.plaintext_violations(path)
  end

  def test_violation_names_the_key_but_never_the_value
    path = write_ejson("environment" => {"STOREFRONT_ACCESS_TOKEN" => "shpat_notarealtoken"})

    violations = EjsonSecrets.plaintext_violations(path)

    refute_includes violations.join(" "), "shpat_notarealtoken"
  end

  def test_underscore_prefixed_keys_are_exempt
    path = write_ejson("_public_key" => "e0f8b2c1", "environment" => {"_comment" => "why this exists"})

    assert_empty EjsonSecrets.plaintext_violations(path)
  end

  def test_nested_objects_are_walked
    path = write_ejson("environment" => {"nested" => {"DEEP_KEY" => "plaintext"}})

    assert_equal ["environment.nested.DEEP_KEY"], EjsonSecrets.plaintext_violations(path)
  end

  def test_non_string_leaves_are_violations_because_ejson_never_encrypts_them
    path = write_ejson("environment" => {"SHOP_ID" => 12345})

    assert_equal ["environment.SHOP_ID"], EjsonSecrets.plaintext_violations(path)
  end

  def test_every_violation_is_reported_not_just_the_first
    path = write_ejson("environment" => {"A_KEY" => "one", "B_KEY" => ENCRYPTED, "C_KEY" => "two"})

    assert_equal ["environment.A_KEY", "environment.C_KEY"], EjsonSecrets.plaintext_violations(path)
  end

  def test_malformed_json_raises_with_the_path
    Dir.mktmpdir do |dir|
      path = File.join(dir, "broken.ejson")
      File.write(path, "{not json")

      error = assert_raises(EjsonSecrets::InvalidFile) { EjsonSecrets.plaintext_violations(path) }
      assert_includes error.message, "broken.ejson"
    end
  end

  private

  def write_ejson(contents)
    dir = Dir.mktmpdir
    path = File.join(dir, "secrets.ejson")
    File.write(path, JSON.pretty_generate(contents))
    path
  end
end
