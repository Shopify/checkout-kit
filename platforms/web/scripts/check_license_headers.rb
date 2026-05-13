#!/usr/bin/env ruby
require 'find'

# Verifies that every TypeScript source file under platforms/web/src has the
# canonical MIT license header at the top. Mirrors
# platforms/android/scripts/check_license_headers.rb in spirit.
#
# Test files (*.test.ts) are excluded — keeping parity with the React Native
# `copy_license` script, which only walks the publishable source tree.

ROOT = File.expand_path('..', __dir__) # platforms/web
SCAN_DIRS = %w[src].freeze
EXTENSIONS = %w[.ts .tsx].freeze

files = []

SCAN_DIRS.each do |dir|
  full = File.join(ROOT, dir)
  next unless File.directory?(full)

  Find.find(full) do |path|
    next unless File.file?(path)
    next unless EXTENSIONS.any? { |ext| path.end_with?(ext) }
    next if path.end_with?('.test.ts', '.test.tsx', '.d.ts')

    lines = File.readlines(path)
    has_header = lines[0]&.start_with?('/*') && lines[1]&.include?('MIT License')
    files << path unless has_header
  end
end

if files.empty?
  puts 'No missing license headers found'
  exit 0
end

puts "#{files.size} file(s) missing license headers:"
files.each { |f| puts "  #{f.sub("#{ROOT}/", '')}" }
exit 1
