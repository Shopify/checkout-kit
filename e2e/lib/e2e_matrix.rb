# frozen_string_literal: true

require "yaml"

class E2EMatrix
  attr_reader :config_path

  def self.load(config_path)
    new(config_path, YAML.safe_load_file(config_path))
  end

  def initialize(config_path, config)
    @config_path = config_path
    @config = config || {}
  end

  def expand
    applications.flat_map do |application|
      os_tracks.flat_map do |os_track|
        suites.map do |suite|
          build_run(application, os_track, suite)
        end
      end
    end
  end

  def run_at(index)
    runs = expand
    runs.fetch(index)
  end

  def validation_errors
    errors = []
    errors << "version must be 1" unless @config.fetch("version", nil) == 1
    validate_collection(errors, "applications", applications)
    validate_collection(errors, "os_tracks", os_tracks)
    validate_collection(errors, "suites", suites)
    validate_applications(errors)
    validate_os_tracks(errors)
    validate_suites(errors)
    errors
  end

  private

  def build_run(application, os_track, suite)
    platform = application.fetch("platform")
    os_track_id = os_track_id(os_track)
    suite_id = suite.fetch("id")
    application_id = application.fetch("id")

    {
      "id" => "#{application_id}-#{os_track_id}-#{suite_id}",
      "application_id" => application_id,
      "target" => application.fetch("target"),
      "platform" => platform,
      "os_track" => os_track_id,
      "device_selector" => device_selector(platform, os_track),
      "app_id" => application.fetch("app_id"),
      "artifact_env" => application.fetch("artifact_env"),
      "execute" => suite.fetch("execute"),
      "ready_marker" => application.fetch("ready_marker"),
      "status_context" => "checkout-kit/e2e/#{application_id}/#{os_track_id}/#{suite_id}"
    }
  end

  def device_selector(platform, os_track)
    return os_track.fetch("device_selector") if os_track.is_a?(Hash) && os_track.key?("device_selector")

    "#{platform}:phone:#{os_track_id(os_track)}"
  end

  def os_track_id(os_track)
    os_track.is_a?(Hash) ? os_track.fetch("id") : os_track
  end

  def applications
    @config.fetch("applications", []) || []
  end

  def os_tracks
    @config.fetch("os_tracks", []) || []
  end

  def suites
    @config.fetch("suites", []) || []
  end

  def validate_collection(errors, name, collection)
    errors << "#{name} must be a non-empty array" unless collection.is_a?(Array) && !collection.empty?
  end

  def validate_applications(errors)
    return unless applications.is_a?(Array)

    validate_unique_ids(errors, "application", applications)
    applications.each do |application|
      id = application.fetch("id", "<missing>")
      required_application_keys.each do |key|
        errors << "application #{id} missing #{key}" if application.fetch(key, "").to_s.empty?
      end
      platform = application.fetch("platform", nil)
      errors << "application #{id} platform must be ios or android" unless ["ios", "android"].include?(platform)
    end
  end

  def validate_os_tracks(errors)
    return unless os_tracks.is_a?(Array)

    ids = os_tracks.map { |os_track| safe_os_track_id(os_track) }
    errors << "os_track ids must be unique" unless ids.compact.uniq.length == ids.compact.length
    os_tracks.each do |os_track|
      id = safe_os_track_id(os_track)
      errors << "os_track missing id" if id.to_s.empty?
    end
  end

  def safe_os_track_id(os_track)
    os_track_id(os_track)
  rescue KeyError
    nil
  end

  def validate_suites(errors)
    return unless suites.is_a?(Array)

    validate_unique_ids(errors, "suite", suites)
    suites.each do |suite|
      id = suite.fetch("id", "<missing>")
      execute = suite.fetch("execute", "")
      errors << "suite #{id} missing execute" if execute.empty?
      next if execute.empty?

      errors << "suite #{id} execute path does not exist: #{execute}" unless File.exist?(File.join(e2e_root, execute))
    end
  end

  def validate_unique_ids(errors, label, collection)
    ids = collection.map { |item| item.fetch("id", nil) }
    errors << "#{label} ids must be unique" unless ids.compact.uniq.length == ids.compact.length
  end

  def required_application_keys
    ["id", "target", "platform", "app_id", "artifact_env", "ready_marker"]
  end

  def e2e_root
    File.expand_path("..", File.dirname(config_path))
  end
end
