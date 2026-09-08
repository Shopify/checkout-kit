# frozen_string_literal: true

module GitHubToken
  ENVIRONMENT_VARIABLES = %w[OVERRIDE_GITHUB_TOKEN GIT_HTTP_PASSWORD].freeze

  def self.resolve(environment = ENV)
    ENVIRONMENT_VARIABLES.each do |name|
      token = environment[name].to_s.strip
      return token unless token.empty?
    end

    nil
  end
end
