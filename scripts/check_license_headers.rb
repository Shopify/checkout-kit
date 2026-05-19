#!/usr/bin/env ruby
require 'find'

# Extensions and excludes are baked in — this script is opinionated for the
# platforms in this repo. Add to these lists when introducing a new language
# or build-output directory that should be covered.
EXTENSIONS = %w[.kt .kts .ts .tsx].freeze
EXCLUDES = %w[
  */build/generated/*
  */build/*
  *.test.ts
  *.test.tsx
  *.d.ts
].freeze

abort 'Usage: check_license_headers.rb <root>' if ARGV.empty?

root = File.expand_path(ARGV[0])
abort "error: #{ARGV[0]} is not a directory" unless File.directory?(root)

missing = []

Find.find(root) do |path|
  next unless File.file?(path)
  next unless EXTENSIONS.any? { |ext| path.end_with?(ext) }
  next if EXCLUDES.any? { |pattern| File.fnmatch?(pattern, path) }

  lines = File.readlines(path)
  has_header = lines[0]&.start_with?('/*') && lines[1]&.include?('MIT License')
  missing << path unless has_header
end

if missing.empty?
  puts 'No missing license headers found'
  exit 0
end

puts "#{missing.size} file(s) missing license headers:"
missing.each { |f| puts "  #{f.sub("#{root}/", '')}" }
exit 1
