# frozen_string_literal: true

class LocalSdkDefault
  ENABLES_LOCAL_SDK = /(?:\A|[\s&;(])(?:export\s+)?USE_LOCAL_SDK=1\b/
  ADDS_MAVEN_LOCAL = /\bmavenLocal\s*\(/
  LOCAL_FLAG_GUARD = /--local/
  USE_LOCAL_SDK_GUARD = /\buseLocalSdk\b/
  LOCAL_FLAG_LOOKBEHIND = 3
  USE_LOCAL_SDK_LOOKBEHIND = 10

  SCANNED_PATHSPECS = [
    "dev.yml",
    ".github/workflows",
    "platforms/android",
    "platforms/react-native",
  ].freeze

  EXCLUDED_PATHS = ["platforms/react-native/scripts/check_no_local_sdk_default"].freeze

  attr_reader :path

  def self.scanned_paths(repo_root)
    Dir.chdir(repo_root) do
      `git ls-files -z -- #{SCANNED_PATHSPECS.join(" ")}`
        .split("\0")
        .reject { |relative| relative.end_with?(".md") || EXCLUDED_PATHS.include?(relative) }
    end
  end

  def self.problems_by_path(repo_root)
    scanned_paths(repo_root).each_with_object({}) do |relative, memo|
      contents = File.read(File.join(repo_root, relative), encoding: "UTF-8")
      next unless contents.valid_encoding?

      problems = new(relative, contents).problems
      memo[relative] = problems unless problems.empty?
    rescue Errno::ENOENT
      next
    end
  end

  def initialize(path, contents)
    @path = path
    @lines = contents.lines.map(&:chomp)
  end

  def problems
    @lines.each_with_index.filter_map do |line, index|
      if ENABLES_LOCAL_SDK.match?(line) && !guarded?(index, LOCAL_FLAG_GUARD, LOCAL_FLAG_LOOKBEHIND)
        "line #{index + 1} sets USE_LOCAL_SDK=1 without a --local opt-in guard"
      elsif ADDS_MAVEN_LOCAL.match?(line) && !guarded?(index, USE_LOCAL_SDK_GUARD, USE_LOCAL_SDK_LOOKBEHIND)
        "line #{index + 1} adds mavenLocal() without a useLocalSdk guard"
      end
    end
  end

  private

  def guarded?(index, pattern, lookbehind)
    @lines[[index - lookbehind, 0].max..index].any? { |line| pattern.match?(line) }
  end
end
