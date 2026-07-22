# frozen_string_literal: true

class GemfileLockAlignment
  RUBY_VERSION_PATTERN = /^RUBY VERSION\n\s+ruby\s+(\d+\.\d+\.\d+)/
  BUNDLED_WITH_PATTERN = /^BUNDLED WITH\n\s+(\S+)/
  FOOTER_PATTERN = /\n+(?:RUBY VERSION|BUNDLED WITH)\n.*\z/m

  attr_reader :path, :locked_ruby_version, :locked_bundler_version

  def self.load(path, base: nil)
    display_path = base ? path.delete_prefix("#{base}/") : path
    new(display_path, File.read(path))
  end

  def self.tracked_lockfiles(repo_root)
    Dir.chdir(repo_root) do
      `git ls-files "*Gemfile.lock"`.split("\n").map { |relative| File.join(repo_root, relative) }
    end
  end

  def self.expected_ruby_version(start_dir)
    dir = File.expand_path(start_dir)
    loop do
      candidate = File.join(dir, ".ruby-version")
      return File.read(candidate).strip if File.file?(candidate)

      parent = File.dirname(dir)
      break if parent == dir

      dir = parent
    end
    nil
  end

  def self.default_bundler_version
    Gem::Specification.find_all_by_name("bundler").find(&:default_gem?)&.version&.to_s
  end

  def self.without_footer(contents)
    "#{contents.sub(FOOTER_PATTERN, "").rstrip}\n"
  end

  def initialize(path, contents)
    @path = path
    @locked_ruby_version = contents[RUBY_VERSION_PATTERN, 1]
    @locked_bundler_version = contents[BUNDLED_WITH_PATTERN, 1]
  end

  def alignment_errors(expected_ruby_version:, expected_bundler_version:)
    errors = []

    if expected_ruby_version.nil?
      errors << "could not resolve a .ruby-version; the Ruby version must always be available"
    elsif locked_ruby_version && locked_ruby_version != expected_ruby_version
      errors << "RUBY VERSION #{locked_ruby_version} does not match .ruby-version #{expected_ruby_version}"
    end

    if locked_bundler_version && expected_bundler_version && locked_bundler_version != expected_bundler_version
      errors << "BUNDLED WITH #{locked_bundler_version} does not match the Ruby's default Bundler #{expected_bundler_version}"
    end

    errors
  end
end
