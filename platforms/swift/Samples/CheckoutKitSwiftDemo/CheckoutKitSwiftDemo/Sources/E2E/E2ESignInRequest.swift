import Foundation

@MainActor
final class E2ESignInRequest: ObservableObject {
    static let shared = E2ESignInRequest()

    @Published private(set) var isPending = false

    func request() {
        isPending = true
    }

    func fulfil() {
        isPending = false
    }
}
