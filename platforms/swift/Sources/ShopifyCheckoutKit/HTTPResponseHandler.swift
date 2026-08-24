import Foundation

final class HTTPResponseHandler {
    enum Disposition: Equatable {
        case handleNormally
        case render
        case discardPreload
    }

    func disposition(
        for response: HTTPURLResponse,
        isForMainFrame: Bool,
        isBackgroundedPreload: Bool
    ) -> Disposition {
        guard isManagedChallenge(response) else {
            return .handleNormally
        }

        guard isForMainFrame, isBackgroundedPreload else {
            return .render
        }

        return .discardPreload
    }

    private func isManagedChallenge(_ response: HTTPURLResponse) -> Bool {
        response.value(forHTTPHeaderField: "cf-mitigated")?
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .caseInsensitiveCompare("challenge") == .orderedSame
    }
}
