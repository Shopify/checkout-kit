# frozen_string_literal: true

require "io/console"
require "open3"
require_relative "common"
require_relative "bitrise_client"

module BitriseAuth
  KEYCHAIN_SERVICE = "com.shopify.checkout-kit.tophat"
  KEYCHAIN_ACCOUNT = "bitrise-pat"
  TOPHAT_KEYCHAIN_SERVICE = "com.shopify.Tophat.TophatBitriseExtension"
  TOPHAT_KEYCHAIN_ACCOUNT = "TophatBitrisePersonalAccessToken"
  TOPHAT_APP = "/Applications/Tophat.app"
  module_function

  def resolve_token(app_slug)
    stored = read_keychain(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT)
    return stored if stored && token_status(stored, app_slug) != :unauthorized

    bootstrap_token(app_slug)
  end

  def clear_token
    system("security", "delete-generic-password", "-s", KEYCHAIN_SERVICE, "-a", KEYCHAIN_ACCOUNT, out: File::NULL, err: File::NULL)
  end

  def ensure_tophat_token(app_slug)
    token = read_keychain(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT)
    return false unless token && token_status(token, app_slug) == :ok

    puts "==> Your saved Bitrise token is authorized, but Tophat's token is missing or invalid; syncing them."
    sync_to_tophat(token)
    true
  end

  def token_status(token, app_slug)
    BitriseClient.new(token: token, app_slug: app_slug).authorized? ? :ok : :unauthorized
  rescue
    :unknown
  end

  def bootstrap_token(app_slug)
    open_token_page
    token = prompt_until_valid(app_slug)
    store_token(token)
    sync_to_tophat(token)
    token
  end

  def open_token_page
    puts <<~MESSAGE

      A Bitrise Personal Access Token is required to check builds and download artifacts.
      Opening the Bitrise token page. Create a token, then paste it below.

    MESSAGE
    system("open", CheckoutKitTophat::BITRISE_PAT_URL)
  end

  def prompt_until_valid(app_slug)
    loop do
      token = prompt_token
      CheckoutKitTophat.abort_with("Cancelled.") if token.nil? || token.empty?

      case token_status(token, app_slug)
      when :ok
        puts "✅ Authentication successful."
        return token
      when :unknown
        warn "Could not reach Bitrise to validate the token; continuing."
        return token
      else
        warn "Bitrise rejected that token. Check it was copied correctly and try again, or press Ctrl-C to cancel."
      end
    end
  end

  def prompt_token
    print "Paste your Bitrise Personal Access Token (input hidden): "
    token = STDIN.tty? ? STDIN.noecho(&:gets) : STDIN.gets
    puts
    token&.strip
  end

  def store_token(token)
    write_keychain(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT, token) ||
      CheckoutKitTophat.abort_with("Could not store the Bitrise token in your keychain.")
  end

  def sync_to_tophat(token)
    return true unless File.exist?(TOPHAT_APP)

    puts <<~MESSAGE
      Storing the token in Tophat for the Bitrise artifact provider.
      🔑 macOS may ask for your login password to let Tophat read this token
      (Recommended) Approve with 'Always Allow' so the install can in future.
    MESSAGE
    system("security", "delete-generic-password", "-s", TOPHAT_KEYCHAIN_SERVICE, "-a", TOPHAT_KEYCHAIN_ACCOUNT, out: File::NULL, err: File::NULL)
    if write_keychain(TOPHAT_KEYCHAIN_SERVICE, TOPHAT_KEYCHAIN_ACCOUNT, token, trusted_app: TOPHAT_APP)
      puts "✅ Tophat is configured with your Bitrise token."
      return true
    end

    warn <<~MESSAGE
      Could not save the token into Tophat automatically.
      Add it manually in Tophat -> Settings -> Extensions -> Bitrise before installing.
    MESSAGE
    false
  end

  def read_keychain(service, account)
    stdout, status = Open3.capture2e("security", "find-generic-password", "-s", service, "-a", account, "-w")
    return nil unless status.success?

    value = stdout.strip
    value.empty? ? nil : value
  end

  def write_keychain(service, account, token, trusted_app: nil)
    args = ["security", "add-generic-password", "-U", "-s", service, "-a", account, "-w", token]
    args += ["-T", trusted_app] if trusted_app
    system(*args, out: File::NULL, err: File::NULL)
  end
end
