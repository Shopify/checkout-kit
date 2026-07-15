# frozen_string_literal: true

require "json"
require "open3"

module CheckoutKitTophat
  TOPHATCTL = "/Applications/Tophat.app/Contents/MacOS/tophatctl"
  MANIFEST = File.expand_path("targets.json", __dir__)
  BITRISE_PAT_URL = "https://app.bitrise.io/me/account/security"
  PLATFORM_LABELS = {"ios" => "iOS", "android" => "Android"}.freeze
  module_function

  def abort_with(message)
    warn message
    exit 1
  end

  def capture(*command)
    stdout, status = Open3.capture2(*command)
    abort_with("Command failed: #{command.join(" ")}") unless status.success?
    stdout
  end

  def load_manifest
    JSON.parse(File.read(MANIFEST))
  end

  def require_tophat!
    abort_with("Tophat is not installed at #{TOPHATCTL}. Run 'dev up' to install it.") unless File.executable?(TOPHATCTL)
  end

  def install_options(manifest)
    manifest.fetch("targets").flat_map do |target|
      aliases_by_platform = target.fetch("aliases", {})
      platforms = target.fetch("recipes").map { |recipe| recipe.fetch("platform") }.uniq
      platforms.map do |platform|
        {
          "id" => "#{target.fetch("id")}-#{platform}",
          "label" => "#{target.fetch("label")} (#{PLATFORM_LABELS.fetch(platform, platform)})",
          "target" => target,
          "platform" => platform,
          "aliases" => aliases_by_platform.fetch(platform, [])
        }
      end
    end
  end

  def find_option(options, requested_id)
    options.find do |option|
      option.fetch("id") == requested_id || option.fetch("aliases").include?(requested_id)
    end
  end

  def artifact_provider_parameters(recipe, app_slug, branch)
    {
      "app_slug" => app_slug,
      "branch" => branch,
      "workflow" => recipe.fetch("workflow"),
      "artifact_name" => recipe.fetch("artifact_name")
    }
  end

  def bitrise_branch_recipe(recipe, app_slug, branch)
    {
      "artifactProviderID" => "bitrise-branch",
      "launchArguments" => [],
      "artifactProviderParameters" => artifact_provider_parameters(recipe, app_slug, branch)
    }
  end

  def install_config(recipe, device, app_slug, branch)
    [
      bitrise_branch_recipe(recipe, app_slug, branch).merge(
        "device" => {
          "name" => device.fetch("name"),
          "platform" => device.fetch("platform"),
          "runtimeVersion" => device.fetch("runtimeVersion")
        }
      )
    ]
  end

  def quick_launch_entry(target, app_slug, branch)
    {
      "id" => "checkout-kit-#{target.fetch("id")}",
      "name" => "Checkout Kit (#{target.fetch("label")})",
      "recipes" => target.fetch("recipes").map do |recipe|
        quick_launch_recipe(recipe, app_slug, branch)
      end
    }
  end

  def quick_launch_recipe(recipe, app_slug, branch)
    config = bitrise_branch_recipe(recipe, app_slug, branch).merge(
      "platformHint" => recipe.fetch("platform")
    )
    destination = recipe.fetch("destination")
    config["destinationHint"] = destination unless destination == "any"
    config
  end
end
