# frozen_string_literal: true

module SwiftCoverageStatus
  def self.state(stages, selected)
    return "failed" unless stages.stage("ci-ios-plan")&.status == "succeeded"
    return "skipped" unless selected.include?("swift-package-tests")

    stages.stage("ci-ios-swift-package-tests")&.status == "succeeded" ? "unavailable" : "failed"
  end
end
