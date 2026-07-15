# frozen_string_literal: true

require "minitest/autorun"
require_relative "../tophat/common"

class TophatOptionsTest < Minitest::Test
  def manifest
    CheckoutKitTophat.load_manifest
  end

  def options
    CheckoutKitTophat.install_options(manifest)
  end

  def resolved_id(requested)
    CheckoutKitTophat.find_option(options, requested)&.fetch("id")
  end

  def test_canonical_ids_resolve_to_themselves
    %w[react-native-ios react-native-android swift-ios kotlin-android].each do |id|
      assert_equal id, resolved_id(id)
    end
  end

  def test_swift_aliases_resolve_to_swift_ios
    %w[swift s i].each { |name| assert_equal "swift-ios", resolved_id(name) }
  end

  def test_kotlin_aliases_resolve_to_kotlin_android
    %w[kotlin k a].each { |name| assert_equal "kotlin-android", resolved_id(name) }
  end

  def test_react_native_ios_aliases
    %w[rn-ios rni].each { |name| assert_equal "react-native-ios", resolved_id(name) }
  end

  def test_react_native_android_aliases
    %w[rn-android rna].each { |name| assert_equal "react-native-android", resolved_id(name) }
  end

  def test_unknown_target_resolves_to_nil
    assert_nil CheckoutKitTophat.find_option(options, "does-not-exist")
  end

  def test_options_expose_their_aliases
    swift = options.find { |option| option.fetch("id") == "swift-ios" }
    assert_equal %w[swift s i], swift.fetch("aliases")
  end

  def test_aliases_and_ids_are_unique_across_options
    names = options.flat_map { |option| [option.fetch("id")] + option.fetch("aliases") }
    assert_equal names.uniq, names
  end
end
