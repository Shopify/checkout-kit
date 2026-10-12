# frozen_string_literal: true

require "json"

class CoverageThresholds
  def initialize(configuration)
    @configuration = configuration
  end

  def failures(report)
    @configuration.fetch(report.platform).filter_map do |metric, minimum|
      raise "Invalid threshold for #{metric}" unless minimum.is_a?(Numeric) && minimum.finite? && minimum.between?(0, 100)

      row = report.rows.find { |entry| entry[0] == metric }
      next "#{metric}: coverage is missing (minimum #{minimum}%)" unless row

      _, covered, total = row
      next "#{metric}: no executable code was measured (minimum #{minimum}%)" if total.zero?
      next if covered * 100 >= minimum * total

      "#{metric}: #{format('%.2f', 100.0 * covered / total)}% (#{covered}/#{total}) is below #{minimum}%"
    end
  end
end
