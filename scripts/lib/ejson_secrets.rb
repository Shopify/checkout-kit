# frozen_string_literal: true

require "json"

# Guards the committed ejson files against plaintext values.
#
# The files in config/secrets live in a public repository, so every value has to
# arrive encrypted. ejson leaves two things alone: keys that start with an
# underscore, and any value that is not a string. Both are therefore reported,
# except for the underscore keys that ejson reserves for metadata.
#
# Violations name the key path only. A plaintext value is by definition a
# possible secret, so it never reaches the output.
module EjsonSecrets
  ENCRYPTED_PREFIX = "EJ[1:"

  InvalidFile = Class.new(StandardError)

  module_function

  def plaintext_violations(path)
    walk(load(path), [])
  end

  def load(path)
    JSON.parse(File.read(path))
  rescue JSON::ParserError => error
    raise InvalidFile, "#{path} is not valid JSON: #{error.message}"
  end

  def walk(node, trail)
    return [] unless node.is_a?(Hash)

    node.flat_map do |key, value|
      next [] if key.start_with?("_")

      path = trail + [key]

      if value.is_a?(Hash)
        walk(value, path)
      elsif encrypted?(value)
        []
      else
        [path.join(".")]
      end
    end
  end

  def encrypted?(value)
    value.is_a?(String) && value.start_with?(ENCRYPTED_PREFIX)
  end

  # Rebuilds a committed file from an edited plaintext copy, keeping the original
  # ciphertext wherever the plaintext is unchanged.
  #
  # `ejson encrypt` skips values that are already encrypted, so anything left as
  # plaintext here is what it re-encrypts. Restoring the untouched ciphertext
  # therefore keeps the diff to the values that actually changed. Without this, a
  # single edit rewrites every value in the file.
  def merge_edits(original:, decrypted:, edited:)
    edited.to_h do |key, value|
      if value.is_a?(Hash)
        [key, merge_edits(original: subtree(original, key), decrypted: subtree(decrypted, key), edited: value)]
      elsif original.key?(key) && decrypted[key] == value
        [key, original[key]]
      else
        [key, value]
      end
    end
  end

  # Names the keys whose plaintext differs, including keys added or removed.
  def changed_keys(decrypted:, edited:, trail: [])
    (decrypted.keys | edited.keys).flat_map do |key|
      path = trail + [key]
      before = decrypted[key]
      after = edited[key]

      if before.is_a?(Hash) && after.is_a?(Hash)
        changed_keys(decrypted: before, edited: after, trail: path)
      elsif before == after
        []
      else
        [path.join(".")]
      end
    end
  end

  def subtree(node, key)
    value = node[key]
    value.is_a?(Hash) ? value : {}
  end
end
