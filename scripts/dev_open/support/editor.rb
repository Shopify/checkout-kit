# frozen_string_literal: true

require 'shellwords'
require 'checkout_kit/cli'

module DevOpen
  # Resolves the editor used to open JS workspaces (React Native, Web).
  #
  # Configured solely via DEV_EDITOR in <repo>/.dev.env (see .dev.env.example).
  # Setting DEV_EDITOR inline (`DEV_EDITOR=code dev rn open`) is intentionally
  # NOT consulted, so behaviour is consistent regardless of how `dev` is invoked.
  module Editor
    DEFAULT = 'open'

    module_function

    # The editor as an argv array, e.g. ["code"] or ["code", "-n"].
    def command(repo_root)
      Shellwords.split(resolve(repo_root))
    end

    def resolve(repo_root)
      value = CheckoutKit::CLI::Dotenv.read(File.join(repo_root, '.dev.env'))['DEV_EDITOR']
      value.nil? || value.empty? ? DEFAULT : value
    end
  end
end
