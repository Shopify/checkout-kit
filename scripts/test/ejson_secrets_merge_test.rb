# frozen_string_literal: true

require "minitest/autorun"
require_relative "../lib/ejson_secrets"

class EjsonSecretsMergeTest < Minitest::Test
  CIPHER_A = "EJ[1:aaa:aaa:aaa]"
  CIPHER_B = "EJ[1:bbb:bbb:bbb]"

  def test_unchanged_value_keeps_its_original_ciphertext
    result = merge(
      original: {"environment" => {"A" => CIPHER_A}},
      decrypted: {"environment" => {"A" => "same"}},
      edited: {"environment" => {"A" => "same"}},
    )

    assert_equal CIPHER_A, result.dig("environment", "A")
  end

  def test_changed_value_becomes_plaintext_for_ejson_to_encrypt
    result = merge(
      original: {"environment" => {"A" => CIPHER_A}},
      decrypted: {"environment" => {"A" => "old"}},
      edited: {"environment" => {"A" => "new"}},
    )

    assert_equal "new", result.dig("environment", "A")
  end

  def test_only_the_changed_key_loses_its_ciphertext
    result = merge(
      original: {"environment" => {"A" => CIPHER_A, "B" => CIPHER_B}},
      decrypted: {"environment" => {"A" => "old", "B" => "keep"}},
      edited: {"environment" => {"A" => "new", "B" => "keep"}},
    )

    assert_equal({"A" => "new", "B" => CIPHER_B}, result["environment"])
  end

  def test_added_key_is_plaintext
    result = merge(
      original: {"environment" => {"A" => CIPHER_A}},
      decrypted: {"environment" => {"A" => "same"}},
      edited: {"environment" => {"A" => "same", "NEW" => "value"}},
    )

    assert_equal "value", result.dig("environment", "NEW")
  end

  def test_removed_key_is_absent_from_the_result
    result = merge(
      original: {"environment" => {"A" => CIPHER_A, "B" => CIPHER_B}},
      decrypted: {"environment" => {"A" => "one", "B" => "two"}},
      edited: {"environment" => {"A" => "one"}},
    )

    refute_includes result["environment"].keys, "B"
  end

  def test_key_order_follows_the_edited_file
    result = merge(
      original: {"environment" => {"A" => CIPHER_A, "B" => CIPHER_B}},
      decrypted: {"environment" => {"A" => "one", "B" => "two"}},
      edited: {"environment" => {"B" => "two", "A" => "one"}},
    )

    assert_equal ["B", "A"], result["environment"].keys
  end

  def test_public_key_passes_through_untouched
    result = merge(
      original: {"_public_key" => "abc", "environment" => {}},
      decrypted: {"_public_key" => "abc", "environment" => {}},
      edited: {"_public_key" => "abc", "environment" => {}},
    )

    assert_equal "abc", result["_public_key"]
  end

  def test_nested_objects_are_merged_at_every_level
    result = merge(
      original: {"environment" => {"nested" => {"A" => CIPHER_A, "B" => CIPHER_B}}},
      decrypted: {"environment" => {"nested" => {"A" => "old", "B" => "keep"}}},
      edited: {"environment" => {"nested" => {"A" => "new", "B" => "keep"}}},
    )

    assert_equal({"A" => "new", "B" => CIPHER_B}, result.dig("environment", "nested"))
  end

  def test_blank_value_filled_in_becomes_plaintext
    result = merge(
      original: {"environment" => {"TOKEN" => CIPHER_A}},
      decrypted: {"environment" => {"TOKEN" => ""}},
      edited: {"environment" => {"TOKEN" => "filled"}},
    )

    assert_equal "filled", result.dig("environment", "TOKEN")
  end

  def test_value_cleared_back_to_blank_becomes_plaintext
    result = merge(
      original: {"environment" => {"TOKEN" => CIPHER_A}},
      decrypted: {"environment" => {"TOKEN" => "was set"}},
      edited: {"environment" => {"TOKEN" => ""}},
    )

    assert_equal "", result.dig("environment", "TOKEN")
  end

  def test_changed_keys_are_reported_by_name
    assert_equal(
      ["environment.A"],
      EjsonSecrets.changed_keys(
        decrypted: {"environment" => {"A" => "old", "B" => "keep"}},
        edited: {"environment" => {"A" => "new", "B" => "keep"}},
      ),
    )
  end

  def test_added_and_removed_keys_count_as_changes
    assert_equal(
      ["environment.GONE", "environment.NEW"],
      EjsonSecrets.changed_keys(
        decrypted: {"environment" => {"GONE" => "x"}},
        edited: {"environment" => {"NEW" => "y"}},
      ).sort,
    )
  end

  private

  def merge(original:, decrypted:, edited:)
    EjsonSecrets.merge_edits(original: original, decrypted: decrypted, edited: edited)
  end
end
