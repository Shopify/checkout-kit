import Foundation

@MainActor
protocol E2ECommandTarget {
    func selectBuyerIdentityMode(_ mode: BuyerIdentityMode) async
    func resetCart() async
    func variantId(atProductIndex index: Int) async throws -> String
    func addCartLine(variantId: String, quantity: Int) async throws
    func showCart() async
    func presentSignIn() async
    func report(failure message: String) async
}

enum E2EControllerError: LocalizedError, Equatable {
    case productIndexOutOfRange(Int)

    var errorDescription: String? {
        switch self {
        case let .productIndexOutOfRange(index):
            return "No product at index \(index)"
        }
    }
}

@MainActor
final class E2EController {
    static let shared = E2EController(target: E2ESampleAppTarget())

    private let target: E2ECommandTarget

    /// Chains every perform(_:) onto the previous one, because @MainActor alone does not
    /// stop a second handle(url:) call from interleaving with the first across await points.
    private var tail: Task<Void, Never>?

    init(target: E2ECommandTarget) {
        self.target = target
    }

    @discardableResult
    func handle(url: String) async -> Bool {
        let link: E2EControlLink?

        do {
            link = try E2EControlLink.parse(url)
        } catch {
            await target.report(failure: E2EController.message(for: error))
            return true
        }

        guard let link else {
            return false
        }

        await enqueue(link)

        return true
    }

    private func enqueue(_ link: E2EControlLink) async {
        let previous = tail
        let task = Task {
            await previous?.value
            await self.perform(link)
        }
        tail = task
        await task.value
    }

    private func perform(_ link: E2EControlLink) async {
        do {
            switch link {
            case .reset:
                await target.resetCart()
            case let .cart(command):
                try await seedCart(command)
            case .signIn:
                await target.presentSignIn()
            }
        } catch {
            await target.report(failure: E2EController.message(for: error))
        }
    }

    private func seedCart(_ command: E2EControlLink.CartCommand) async throws {
        if let buyerIdentityMode = command.buyerIdentityMode {
            await target.selectBuyerIdentityMode(buyerIdentityMode)
        }

        await target.resetCart()

        let variantId = try await variantId(for: command)

        try await target.addCartLine(variantId: variantId, quantity: command.quantity)
        await target.showCart()
    }

    private func variantId(for command: E2EControlLink.CartCommand) async throws -> String {
        if let variantId = command.variantId {
            return variantId
        }

        return try await target.variantId(atProductIndex: command.productIndex ?? 0)
    }

    private static func message(for error: Error) -> String {
        (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
    }
}
