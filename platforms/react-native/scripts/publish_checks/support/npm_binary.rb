# frozen_string_literal: true

module PublishChecks
  module NpmBinary
    module_function

    def find_unwrapped(override: nil)
      return override unless override.nil? || override.empty?

      candidates = `which -a npm 2>/dev/null`.split("\n")
      candidates.each do |candidate|
        real_candidate = File.realpath(candidate) rescue candidate
        next if candidate.include?('package-manager-wrappers') || real_candidate.include?('package-manager-wrappers')
        next if candidate.include?('npm-wrapper') || real_candidate.include?('npm-wrapper')
        next unless File.executable?(candidate)

        return candidate
      end

      nil
    end
  end
end
