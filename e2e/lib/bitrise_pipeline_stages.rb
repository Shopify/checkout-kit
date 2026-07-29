# frozen_string_literal: true

require "json"

# Reads the pipeline workflow roster Bitrise exposes as BITRISEIO_FINISHED_WORKFLOWS
# so a report can name the stages that failed instead of only counting the runs that
# never arrived. Bitrise signals "this stage never started" with a blank external_id
# rather than with a status string, and documents no enum for the status field, so
# anything outside the known success and in-flight values counts as a failure.
class BitrisePipelineStages
  Stage = Struct.new(:name, :status, :build_slug, :build_url, keyword_init: true)

  SUCCESS_STATUSES = ["succeeded", "succeeded_with_abort"].freeze
  UNFINISHED_STATUSES = ["initializing", "on_hold", "running"].freeze
  EXCLUDED_STAGE_NAMES = ["e2e-report"].freeze
  PARALLEL_COPY_SUFFIX = /_\d+\z/
  BUILD_URL_TEMPLATE = "https://app.bitrise.io/app/%<app_slug>s/build/%<build_slug>s"

  def self.from_json(json, app_slug: nil)
    new(parse(json), app_slug: app_slug)
  end

  def self.parse(json)
    payload = JSON.parse(json.to_s)
    payload.is_a?(Array) ? payload.select { |entry| entry.is_a?(Hash) } : []
  rescue JSON::ParserError
    []
  end

  def initialize(entries, app_slug: nil)
    @app_slug = app_slug
    @stages = collapse(entries)
  end

  def failed
    @stages.select { |stage| failure_status?(stage.status) }
  end

  def not_executed
    @stages.select { |stage| blank?(stage.build_slug) }
  end

  private

  def collapse(entries)
    grouped = entries.reject { |entry| excluded?(entry) }.group_by { |entry| stage_name(entry) }
    grouped.map { |name, copies| stage_for(name, copies) }
  end

  def stage_for(name, copies)
    executed = copies.reject { |copy| blank?(copy["external_id"]) }
    representative = executed.find { |copy| failure_status?(copy["status"]) } || executed.first
    build_slug = representative && representative["external_id"]
    Stage.new(
      name: name,
      status: representative && representative["status"],
      build_slug: build_slug,
      build_url: build_url(build_slug)
    )
  end

  def build_url(build_slug)
    return nil if blank?(build_slug) || blank?(@app_slug)

    format(BUILD_URL_TEMPLATE, app_slug: @app_slug, build_slug: build_slug)
  end

  def failure_status?(status)
    return false if blank?(status)

    !SUCCESS_STATUSES.include?(status) && !UNFINISHED_STATUSES.include?(status)
  end

  def excluded?(entry)
    EXCLUDED_STAGE_NAMES.include?(stage_name(entry))
  end

  def stage_name(entry)
    entry["name"].to_s.sub(PARALLEL_COPY_SUFFIX, "")
  end

  def blank?(value)
    value.nil? || value.to_s.strip.empty?
  end
end
