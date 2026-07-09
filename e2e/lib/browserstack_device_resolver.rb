# frozen_string_literal: true

# Resolves abstract E2E device selectors, such as `ios:phone:latest`, to a
# concrete BrowserStack device and OS version that is currently available.
class BrowserStackDeviceResolver
  def initialize(devices, limits = [])
    @devices = devices
    @limits = limits
  end

  def resolve(selector)
    platform, form_factor, version_tag = selector.split(":")
    raise ArgumentError, "unsupported device selector: #{selector}" unless platform && form_factor == "phone" && version_tag

    candidates = available_phone_devices(platform)
    os_version = os_version_for_tag(candidates, version_tag)
    device = candidates.select { |candidate| candidate.fetch("os_version") == os_version }
      .sort_by { |candidate| candidate.fetch("device") }
      .first

    raise ArgumentError, "no BrowserStack device available for #{selector}" unless device

    {
      "device_selector" => selector,
      "platform" => platform,
      "os_version_tag" => version_tag,
      "resolved_device" => device.fetch("device"),
      "resolved_os_version" => device.fetch("os_version"),
      "browserstack_device" => "#{device.fetch("device")}-#{device.fetch("os_version")}" 
    }
  end

  private

  def available_phone_devices(platform)
    @devices.select do |device|
      device.fetch("os") == platform &&
        device.fetch("realMobile", true) &&
        phone?(device.fetch("device")) &&
        available?(device)
    end
  end

  def phone?(device_name)
    !device_name.match?(/ipad|tablet| tab\b/i)
  end

  def available?(device)
    limit = @limits.find do |candidate|
      candidate.fetch("os") == device.fetch("os") &&
        candidate.fetch("os_version") == device.fetch("os_version") &&
        candidate.fetch("device") == device.fetch("device")
    end

    return true unless limit

    limit.fetch("group_usage", 0).to_i < limit.fetch("device_limit", 1).to_i
  end

  def os_version_for_tag(candidates, version_tag)
    versions = candidates.map { |candidate| candidate.fetch("os_version") }.uniq.sort_by { |version| version_segments(version) }
    raise ArgumentError, "no BrowserStack devices available" if versions.empty?

    case version_tag
    when "latest"
      versions.last
    when "previous"
      major_versions = versions.group_by { |version| version_segments(version).first }.keys.sort
      previous_major = major_versions[-2]
      raise ArgumentError, "no previous BrowserStack OS version available" unless previous_major

      versions.select { |version| version_segments(version).first == previous_major }.last
    else
      raise ArgumentError, "unsupported OS version tag: #{version_tag}"
    end
  end

  def version_segments(version)
    version.to_s.split(".").map(&:to_i)
  end
end
