import Network
import ShopifyCheckoutKit
import SwiftUI
import UIKit
import WebKit
import XCTest

/// Presents `ShopifyCheckout` in a real SwiftUI `.sheet`, the way apps and `CartView` do. These
/// tests need the sample app as a test host: sheets do not present without a window scene.
@MainActor
final class CheckoutSheetDismissalTests: XCTestCase {
    private static let closeButtonIdentifier = "shopify_checkout_kit_close_button"

    private var originalConfiguration: Configuration!
    private var server: StalledCheckoutServer!
    private var sheet: SheetState!
    private var host: UIHostingController<SheetHost>!
    private var window: UIWindow!
    private var events: [String] = []
    private var sheetWasOpenAtDismissal: Bool?

    override func setUp() async throws {
        try await super.setUp()
        originalConfiguration = ShopifyCheckout.configuration
        ShopifyCheckout.configure { $0.preloading.enabled = false }
        server = try StalledCheckoutServer()
        let checkoutURL = try await server.start()

        sheet = SheetState(url: checkoutURL)
        host = UIHostingController(rootView: SheetHost(
            sheet: sheet,
            onDismiss: { [unowned self] in
                events.append("dismiss")
                sheetWasOpenAtDismissal = host.presentedViewController != nil
            },
            onFail: { [unowned self] _ in events.append("fail") }
        ))
        let scene = try XCTUnwrap(
            UIApplication.shared.connectedScenes.lazy.compactMap { $0 as? UIWindowScene }.first
        )
        window = UIWindow(windowScene: scene)
        window.rootViewController = host
        window.makeKeyAndVisible()
    }

    override func tearDown() async throws {
        if host.presentedViewController != nil {
            sheet.isPresented = false
            try await waitUntil { self.host.presentedViewController == nil }
        }
        window.isHidden = true
        window = nil
        host = nil
        sheet = nil
        server.stop()
        server = nil
        ShopifyCheckout.configure { $0 = originalConfiguration }
        try await super.tearDown()
    }

    func testSwipeDownCallsOnDismissOnceAfterTheSheetCloses() async throws {
        try await presentCheckout()

        try await swipeDown()

        XCTAssertEqual(events, ["dismiss"])
        XCTAssertEqual(sheetWasOpenAtDismissal, false)
        XCTAssertFalse(sheet.isPresented)
    }

    func testSwipeDownReleasesTheWebViewAndCheckoutCanBePresentedAgain() async throws {
        let dismissedCheckout = try await presentCheckout()

        try await swipeDown()

        XCTAssertFalse(dismissedCheckout.view.containsWebView)
        let presentedAgain = try await presentCheckout()
        XCTAssertFalse(presentedAgain === dismissedCheckout)
        XCTAssertTrue(presentedAgain.view.containsWebView)
        XCTAssertEqual(events, ["dismiss"])
    }

    func testCanceledSwipeDownDoesNotCallOnDismiss() async throws {
        let checkout = try await presentCheckout()

        try await swipeDown(completes: false)

        XCTAssertEqual(events, [])
        XCTAssertNotNil(host.presentedViewController)
        XCTAssertTrue(checkout.view.containsWebView)
    }

    func testCloseButtonCallsOnDismissOnce() async throws {
        let checkout = try await presentCheckout()

        try tapCloseButton(in: checkout)
        try await waitUntil { self.host.presentedViewController == nil }
        try await settle()

        XCTAssertEqual(events, ["dismiss"])
        XCTAssertFalse(sheet.isPresented)
    }

    func testTerminalFailureCallsOnFailThenOnDismissOnce() async throws {
        try await presentCheckout()

        server.dropConnections()
        try await waitUntil { self.host.presentedViewController == nil }
        try await settle()

        XCTAssertEqual(events, ["fail", "dismiss"])
    }

    func testSettingIsPresentedToFalseDoesNotCallOnDismiss() async throws {
        let checkout = try await presentCheckout()

        sheet.isPresented = false
        try await waitUntil { self.host.presentedViewController == nil }
        try await settle()

        XCTAssertEqual(events, [])
        XCTAssertFalse(checkout.view.containsWebView)
    }

    func testRebuildingCheckoutInsideTheSheetDoesNotCallOnDismiss() async throws {
        let original = try await presentCheckout()

        sheet.checkoutIdentity += 1
        try await waitUntil { self.presentedCheckout.map { $0 !== original } ?? false }
        try await settle()

        XCTAssertEqual(events, [])
        XCTAssertNotNil(host.presentedViewController)
    }

    func testPushingAndPoppingInsideTheSheetDoesNotCallOnDismiss() async throws {
        let checkout = try await presentCheckout()
        let pushed = UIViewController()

        checkout.pushViewController(pushed, animated: true)
        try await waitUntil { checkout.topViewController === pushed && checkout.transitionCoordinator == nil }
        checkout.popViewController(animated: true)
        try await waitUntil { checkout.topViewController !== pushed && checkout.transitionCoordinator == nil }
        try await settle()

        XCTAssertEqual(events, [])
        XCTAssertTrue(checkout.view.containsWebView)
    }

    func testFullScreenPresentationOverCheckoutDoesNotCallOnDismiss() async throws {
        let checkout = try await presentCheckout()
        let cover = UIViewController()
        cover.modalPresentationStyle = .fullScreen

        checkout.present(cover, animated: true)
        try await waitUntil { cover.viewIfLoaded?.window != nil && !cover.isBeingPresented }
        cover.dismiss(animated: true)
        try await waitUntil { checkout.presentedViewController == nil }
        try await settle()

        XCTAssertEqual(events, [])
        XCTAssertNotNil(host.presentedViewController)
        XCTAssertTrue(checkout.view.containsWebView)
    }

    // MARK: Helpers

    @discardableResult
    private func presentCheckout() async throws -> CheckoutViewController {
        sheet.isPresented = true
        try await waitUntil {
            guard let presented = self.host.presentedViewController else { return false }
            return !presented.isBeingPresented && self.presentedCheckout?.view.window != nil
        }
        return try XCTUnwrap(presentedCheckout)
    }

    private var presentedCheckout: CheckoutViewController? {
        host.presentedViewController?.children.lazy.compactMap { $0 as? CheckoutViewController }.first
    }

    /// Dismisses the sheet with an interactive transition, as a buyer's swipe-down does. After a
    /// completed swipe, UIKit reports the dismissal to the sheet's presentation delegate, which
    /// SwiftUI owns.
    private func swipeDown(completes: Bool = true) async throws {
        let presented = try XCTUnwrap(host.presentedViewController)
        let swipe = InteractiveSwipeDown()
        presented.transitioningDelegate = swipe
        defer { presented.transitioningDelegate = nil }

        presented.dismiss(animated: true)
        try await waitUntil { presented.transitionCoordinator != nil }
        swipe.interaction.update(0.5)

        if completes {
            swipe.interaction.finish()
            try await waitUntil { self.host.presentedViewController == nil }
            if let presentationController = presented.presentationController {
                presentationController.delegate?.presentationControllerDidDismiss?(presentationController)
            }
        } else {
            swipe.interaction.cancel()
            try await waitUntil { presented.transitionCoordinator == nil }
        }

        try await settle()
        withExtendedLifetime(swipe) {}
    }

    private func tapCloseButton(in checkout: CheckoutViewController) throws {
        let item = try XCTUnwrap(
            checkout.topViewController?.navigationItem.rightBarButtonItem,
            "Checkout should show a close button"
        )
        XCTAssertEqual(item.accessibilityIdentifier, Self.closeButtonIdentifier)
        let action = try XCTUnwrap(item.action)
        XCTAssertTrue(UIApplication.shared.sendAction(action, to: item.target, from: item, for: nil))
    }

    private func waitUntil(
        timeout: TimeInterval = 5,
        file: StaticString = #filePath,
        line: UInt = #line,
        _ condition: @MainActor () -> Bool
    ) async throws {
        let deadline = Date().addingTimeInterval(timeout)
        while !condition() {
            guard Date() < deadline else {
                XCTFail("Timed out waiting for condition", file: file, line: line)
                throw CancellationError()
            }
            try await Task.sleep(nanoseconds: 20_000_000)
        }
    }

    /// Lets SwiftUI apply pending view updates and UIKit run trailing callbacks.
    private func settle() async throws {
        try await Task.sleep(nanoseconds: 300_000_000)
    }
}

@MainActor
private final class SheetState: ObservableObject {
    @Published var isPresented = false
    @Published var checkoutIdentity = 0
    let url: URL

    init(url: URL) {
        self.url = url
    }
}

private struct SheetHost: View {
    @ObservedObject var sheet: SheetState
    let onDismiss: () -> Void
    let onFail: (CheckoutFailureEvent) -> Void

    var body: some View {
        Color.clear
            .sheet(isPresented: $sheet.isPresented) {
                ShopifyCheckout(checkout: sheet.url)
                    .onDismiss(onDismiss)
                    .onFail(onFail)
                    .id(sheet.checkoutIdentity)
            }
    }
}

/// Serves a checkout URL on the loopback interface that accepts connections and never answers,
/// so checkout stays loading without network access until the test drops the connections.
private final class StalledCheckoutServer: @unchecked Sendable {
    private let listener: NWListener
    private let queue = DispatchQueue(label: "StalledCheckoutServer")
    private var connections: [NWConnection] = []
    private var dropsConnections = false

    init() throws {
        let parameters = NWParameters.tcp
        parameters.requiredLocalEndpoint = .hostPort(host: .ipv4(.loopback), port: .any)
        listener = try NWListener(using: parameters)
    }

    func start() async throws -> URL {
        let port: NWEndpoint.Port = try await withCheckedThrowingContinuation { continuation in
            listener.stateUpdateHandler = { [listener] state in
                switch state {
                case .ready:
                    listener.stateUpdateHandler = nil
                    continuation.resume(returning: listener.port!)
                case let .failed(error):
                    listener.stateUpdateHandler = nil
                    continuation.resume(throwing: error)
                default:
                    break
                }
            }
            listener.newConnectionHandler = { [weak self] connection in
                self?.accept(connection)
            }
            listener.start(queue: queue)
        }
        return URL(string: "https://127.0.0.1:\(port.rawValue)/checkouts/cn/test")!
    }

    /// Closes open connections and every later one, which checkout reports as a terminal failure.
    func dropConnections() {
        queue.sync {
            dropsConnections = true
            connections.forEach { $0.cancel() }
            connections.removeAll()
        }
    }

    func stop() {
        dropConnections()
        listener.cancel()
    }

    private func accept(_ connection: NWConnection) {
        guard !dropsConnections else {
            connection.cancel()
            return
        }
        connections.append(connection)
        connection.start(queue: queue)
    }
}

private final class InteractiveSwipeDown: NSObject, UIViewControllerTransitioningDelegate {
    let interaction: UIPercentDrivenInteractiveTransition = {
        let interaction = UIPercentDrivenInteractiveTransition()
        interaction.wantsInteractiveStart = true
        return interaction
    }()

    func animationController(forDismissed _: UIViewController) -> (any UIViewControllerAnimatedTransitioning)? {
        SlideDownAnimator()
    }

    func interactionControllerForDismissal(
        using _: any UIViewControllerAnimatedTransitioning
    ) -> (any UIViewControllerInteractiveTransitioning)? {
        interaction
    }
}

private final class SlideDownAnimator: NSObject, UIViewControllerAnimatedTransitioning {
    func transitionDuration(using _: (any UIViewControllerContextTransitioning)?) -> TimeInterval {
        0.2
    }

    func animateTransition(using context: any UIViewControllerContextTransitioning) {
        let view = context.view(forKey: .from)
        let offset = context.containerView.bounds.height
        UIView.animate(
            withDuration: transitionDuration(using: context),
            animations: { view?.transform = CGAffineTransform(translationX: 0, y: offset) },
            completion: { _ in
                if context.transitionWasCancelled {
                    view?.transform = .identity
                }
                context.completeTransition(!context.transitionWasCancelled)
            }
        )
    }
}

extension UIView {
    fileprivate var containsWebView: Bool {
        self is WKWebView || subviews.contains { $0.containsWebView }
    }
}
