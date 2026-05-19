#!/usr/bin/env ruby
require 'find'

# Strict license header check: each scanned source file must open with a block
# comment that, after whitespace normalisation, byte-matches the repo-root
# LICENSE wrapped in /* */.
#
# Extensions, prune dirs, and exclude patterns are baked in — this script is
# opinionated for the platforms in this repo. Add to these lists when
# introducing a new language or build-output directory.
EXTENSIONS = %w[.kt .kts .java .ts .tsx .swift].freeze
PRUNE_DIRS = %w[.build .swiftpm DerivedData Generated build .gradle node_modules dist coverage].freeze
EXCLUDE_PATTERNS = %w[
  *.test.ts
  *.test.tsx
  *.d.ts
  */Package.swift
].freeze

REPO_ROOT = File.expand_path('..', __dir__)
EXPECTED = ("/*\n" + File.read(File.join(REPO_ROOT, 'LICENSE')) + "*/\n").gsub(/\s+/, ' ').strip

abort 'Usage: check_license_headers.rb <root>' if ARGV.empty?

root = File.expand_path(ARGV[0])
abort "error: #{ARGV[0]} is not a directory" unless File.directory?(root)

mismatched = []

Find.find(root) do |path|
  if File.directory?(path) && PRUNE_DIRS.include?(File.basename(path))
    Find.prune
  end

  next unless File.file?(path)
  next unless EXTENSIONS.any? { |ext| path.end_with?(ext) }
  next if EXCLUDE_PATTERNS.any? { |pattern| File.fnmatch?(pattern, path) }

  block = File.read(path)[/\A\s*\/\*.*?\*\//m]
  actual = block ? block.gsub(/\s+/, ' ').strip : ''
  mismatched << path if actual != EXPECTED
end

if mismatched.empty?
  puts 'All files have a matching license header'
  exit 0
end

puts "#{mismatched.size} file(s) with missing or mismatched license headers:"
mismatched.each { |f| puts "  #{f.sub("#{root}/", '')}" }
exit 1
