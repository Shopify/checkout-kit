# frozen_string_literal: true

require "time"

# Pure classification of a target's Bitrise CI state relative to a PR's HEAD
# commit. Callers fetch the build data and artifact readiness over the network,
# then hand plain data here to decide what the install flow should offer.
module TophatBuildState
  module_function

  RUNNING_STATUS = 0
  SUCCESS_STATUS = 1

  Evaluation = Struct.new(:workflow, :head, :head_ready, :current, :installable, keyword_init: true)

  def head_build(builds, head_sha)
    builds.find { |build| build["commit_hash"] == head_sha }
  end

  def workflow_state(evaluation)
    head = evaluation.head
    if head
      return :head_ready if evaluation.head_ready
      return :head_running if head.fetch("status") == RUNNING_STATUS

      return :failed
    end

    current = evaluation.current
    return :none unless current
    return :stale_running if current.fetch("status") == RUNNING_STATUS
    return :stale_ready if evaluation.installable

    :failed
  end

  def combine(evaluations)
    states = evaluations.map { |evaluation| workflow_state(evaluation) }
    return :head_ready if states.all? { |state| state == :head_ready }
    return :head_running if states.include?(:head_running)
    return :failed if states.include?(:failed)
    return :stale_ready if states.all? { |state| state == :stale_ready }
    return :stale_running if states.include?(:stale_running)

    :none
  end

  def installable_available?(evaluations)
    evaluations.all? { |evaluation| !evaluation.installable.nil? }
  end

  def running_head_builds(evaluations)
    evaluations
      .map(&:head)
      .compact
      .select { |build| build.fetch("status") == RUNNING_STATUS }
      .uniq { |build| build.fetch("slug") }
  end

  def menu_choices(state:, installable_available:)
    choices = [state == :head_running ? :wait_head : :trigger_head]
    choices << :install_current if installable_available
    choices << :cancel
    choices
  end

  def describe_build(build, now:, behind_by: nil)
    parts = [short_sha(build.fetch("commit_hash"))]
    title = commit_title(build["commit_message"])
    parts << %("#{title}") if title
    parts << "#{behind_by} behind" if behind_by && behind_by.positive?
    age = relative_age(build, now: now)
    parts << age if age
    parts.join(" · ")
  end

  def short_sha(commit_hash)
    commit_hash.to_s[0, 7]
  end

  def commit_title(commit_message)
    return nil unless commit_message

    title = commit_message.to_s.lines.first.to_s.strip
    return nil if title.empty?

    title.length > 60 ? "#{title[0, 57]}..." : title
  end

  def relative_age(build, now:)
    stamp = build["finished_at"] || build["triggered_at"]
    return nil unless stamp

    seconds = (now - Time.parse(stamp)).to_i
    return nil if seconds.negative?
    return "#{seconds / 86_400}d ago" if seconds >= 86_400
    return "#{seconds / 3_600}h ago" if seconds >= 3_600
    return "#{seconds / 60}m ago" if seconds >= 60

    "just now"
  rescue ArgumentError
    nil
  end
end
