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
    return stored if stored && authorized?(stored, app_slug)

    bootstrap_token(app_slug)
  end

  def authorized?(token, app_slug)
    BitriseClient.new(token: token, app_slug: app_slug).authorized?
  end

  def bootstrap_token(app_slug)
    open_token_page
    token = prompt_until_valid(app_slug)
    store_token(token)
    propagate_to_tophat(token)
    token
  end

  def open_token_page
    puts <<~MESSAGE

      A Bitrise Personal Access Token is required to check which builds are ready.
      Opening the Bitrise token page. Create a token, then paste it below.

    MESSAGE
    system("open", CheckoutKitTophat::BITRISE_PAT_URL)
  end

  def prompt_until_valid(app_slug)
    loop do
      token = prompt_token
      CheckoutKitTophat.abort_with("Cancelled.") if token.nil? || token.empty?
      return token if authorized?(token, app_slug)

      warn "Bitrise did not accept that token. Check it was copied correctly and try again, or press Ctrl-C to cancel."
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

  def propagate_to_tophat(token)
    return unless File.exist?(TOPHAT_APP)

    puts <<~MESSAGE
      Saving the token into Tophat so installs can download build artifacts.
      macOS may ask to let "security" update Tophat's keychain entry; choose Always Allow.
      To skip this, add the token yourself in Tophat -> Settings -> Extensions -> Bitrise.

    MESSAGE
    return if write_keychain(TOPHAT_KEYCHAIN_SERVICE, TOPHAT_KEYCHAIN_ACCOUNT, token, trusted_app: TOPHAT_APP)

    warn <<~MESSAGE
      Could not save the token into Tophat automatically.
      Add it manually in Tophat -> Settings -> Extensions -> Bitrise before installing.
    MESSAGE
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
