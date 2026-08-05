# frozen_string_literal: true

require_relative "changed_file_filters"

class CheckSelection
  ALL_CHECKS = %i[android swift react_native web protocol_typescript scripts e2e].freeze

  def initialize(filters:)
    @filters = filters
  end

  def checks_for(changed_files)
    files = Array(changed_files).map(&:to_s).reject(&:empty?)
    return ALL_CHECKS if files.empty? || infrastructure_changed?(files)

    matched = @filters.matching_filters(files)
    checks = []

    checks << :android if matched.include?("android") || matched.include?("protocolKotlin")
    checks << :swift if matched.intersect?(%w[swift protocolSwift packageSwift])
    checks << :react_native if matched.intersect?(%w[reactNative protocolTypescript])
    checks << :web if matched.include?("web")
    checks << :protocol_typescript if matched.include?("protocolTypescript")
    e2e_changed = matched.include?("e2e")
    checks << :scripts if scripts_changed?(files) || e2e_changed
    checks << :e2e if e2e_changed

    # Protocol schemas and generation tooling can update every generated language
    # binding. The language-specific filters above keep implementation-only edits
    # scoped to their respective platform checks.
    checks.concat(%i[android swift react_native protocol_typescript]) if common_protocol_changed?(matched)

    checks.uniq
  end

  private

  def infrastructure_changed?(files)
    files.any? do |file|
      file == "dev.yml" ||
        file.start_with?(".github/workflows/", ".github/actions/", ".ci/")
    end
  end

  def scripts_changed?(files)
    files.any? do |file|
      file.start_with?("scripts/", "e2e/lib/", "e2e/test/")
    end
  end

  def common_protocol_changed?(matched)
    matched.include?("protocol") &&
      !matched.intersect?(%w[protocolKotlin protocolSwift protocolTypescript])
  end
end
