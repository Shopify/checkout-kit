import Foundation

final class CloudflareManagedChallengeHandler {
    enum Disposition: Equatable {
        case notChallenge
        case render
        case discardPreload
    }

    func disposition(
        for response: HTTPURLResponse,
        isForMainFrame: Bool,
        isBackgroundedPreload: Bool
    ) -> Disposition {
        guard response.value(forHTTPHeaderField: "cf-mitigated")?
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .caseInsensitiveCompare("challenge") == .orderedSame
        else {
            return .notChallenge
        }

        guard isForMainFrame, isBackgroundedPreload else {
            return .render
        }

        return .discardPreload
    }
}
