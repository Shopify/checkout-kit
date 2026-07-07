# frozen_string_literal: true

require "yaml"

class ChangedFileFilters
  UNSUPPORTED_METACHARACTERS = /[{}()\[\]]/

  attr_reader :filters

  def self.load(path)
    new(YAML.safe_load_file(path, aliases: true) || {})
  end

  def initialize(filters)
    @filters = filters || {}
    @compiled_patterns = {}
  end

  def match?(filter_names, changed_files)
    names = Array(filter_names).map(&:to_s)
    files = Array(changed_files).map(&:to_s)
    names.any? do |name|
      patterns = filters.fetch(name)
      files.any? { |path| path_matches_filter?(path, patterns) }
    end
  end

  def matching_filters(changed_files)
    filters.keys.select { |name| match?([name], changed_files) }
  end

  def validation_errors
    errors = []
    unless filters.is_a?(Hash)
      errors << "changed file filters must be a map"
      return errors
    end

    filters.each do |name, patterns|
      if !patterns.is_a?(Array) || patterns.empty?
        errors << "changed file filter #{name} must be a non-empty array"
        next
      end

      patterns.each do |pattern|
        if pattern.to_s.empty?
          errors << "changed file filter #{name} patterns must be non-empty strings"
          next
        end

        errors << "changed file filter #{name} pattern #{pattern} uses unsupported glob syntax" if UNSUPPORTED_METACHARACTERS.match?(pattern)
      end
    end
    errors
  end

  private

  def path_matches_filter?(path, patterns)
    positives, negatives = patterns.partition { |pattern| !pattern.start_with?("!") }
    positives.any? { |pattern| pattern_matches_path?(pattern, path) } &&
      negatives.none? { |pattern| pattern_matches_path?(pattern.delete_prefix("!"), path) }
  end

  def pattern_matches_path?(pattern, path)
    compiled_pattern(pattern).match?(path)
  end

  def compiled_pattern(pattern)
    @compiled_patterns[pattern] ||= compile_pattern(pattern)
  end

  def compile_pattern(pattern)
    segments = pattern.split("/", -1)
    source = +"\\A"
    segments.each_with_index do |segment, index|
      last = index == segments.length - 1
      if segment == "**"
        source << (last ? ".*" : "(?:[^/]+/)*")
      else
        source << segment_to_regex(segment)
        source << "/" unless last
      end
    end
    Regexp.new(source << "\\z")
  end

  def segment_to_regex(segment)
    segment.each_char.map do |char|
      case char
      when "*" then "[^/]*"
      when "?" then "[^/]"
      else Regexp.escape(char)
      end
    end.join
  end
end
