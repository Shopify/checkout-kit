#if !COCOAPODS
    import CheckoutKitTelemetry
#endif
import UIKit
import WebKit

@MainActor
struct PreloadKey: Hashable {
    let url: URL
    let entryPoint: MetaData.EntryPoint?
}

@MainActor
final class PreloadCache {
    private struct Entry {
        let key: PreloadKey
        let view: CheckoutWebView
        let createdAt: Date
        let now: () -> Date

        private static let ttl: TimeInterval = 5 * 60

        init(key: PreloadKey, view: CheckoutWebView, createdAt: Date, now: @escaping () -> Date) {
            self.key = key
            self.view = view
            self.createdAt = createdAt
            self.now = now
        }

        var isStale: Bool {
            remainingTTL <= 0
        }

        var remainingTTL: TimeInterval {
            Self.ttl - now().timeIntervalSince(createdAt)
        }
    }

    private static let keepAliveInterval: TimeInterval = 0.5

    private var entry: Entry?
    private var keepAliveTimer: (any PreloadScheduledTask)?
    private var expiryTimer: (any PreloadScheduledTask)?
    private var keepAliveGeneration: UUID?
    private var expiryGeneration: UUID?
    private let now: () -> Date
    private let scheduler: any PreloadScheduling
    private let evaluateKeepAlive: @MainActor (CheckoutWebView) async throws -> Void

    init(
        now: @escaping () -> Date = Date.init,
        scheduler: any PreloadScheduling = PreloadTimerScheduler(),
        evaluateKeepAlive: @escaping @MainActor (CheckoutWebView) async throws -> Void = {
            _ = try await $0.evaluateJavaScript("void 0")
        }
    ) {
        self.now = now
        self.scheduler = scheduler
        self.evaluateKeepAlive = evaluateKeepAlive
    }

    private(set) var state: PreloadState = .idle

    /// The cache notifies a single observer. Each `preload(checkout:)` call
    /// replaces it, so only the most recently returned `CheckoutPreload` handle
    /// receives state updates; earlier handles stop observing.
    private weak var observer: CheckoutPreload?

    func setObserver(_ observer: CheckoutPreload) {
        self.observer = observer
    }

    func store(_ view: CheckoutWebView, for key: PreloadKey, createdAt: Date? = nil) -> Bool {
        invalidate()

        let entry = Entry(key: key, view: view, createdAt: createdAt ?? now(), now: now)
        guard !entry.isStale else {
            return false
        }

        view.frame = Self.preloadFrame()
        self.entry = entry
        startKeepAlive(for: view)
        startExpiryTimer(after: entry.remainingTTL)
        transition(to: .loading)
        return true
    }

    func transition(to newState: PreloadState) {
        guard state != newState else { return }

        state = newState
        observer?.receive(newState)
    }

    /// Evicts the cached view, then notifies observers of the resulting `state`.
    /// Clearing before notifying ensures a preload started re-entrantly from the
    /// callback is not wiped by this invalidation.
    func evict(with state: PreloadState) {
        invalidate()
        transition(to: state)
    }

    func view(for key: PreloadKey) -> CheckoutWebView? {
        guard let cached = entry, cached.key == key, !cached.isStale else {
            let missed = entry
            invalidate()
            if let missed {
                transition(to: missed.isStale ? .expired : .idle)
            }
            return nil
        }

        stopKeepAlive()
        stopExpiryTimer()
        cached.view.hasBeenPresented = true
        return cached.view
    }

    /// Retains a dismissed cached view for the remainder of its original preload TTL.
    ///
    /// The expiry timer is paused while a cached view is presented so it cannot evict a live
    /// checkout session. Re-arm it after dismissal without resetting `createdAt`.
    @discardableResult
    func retainAfterPresentation(_ view: CheckoutWebView) -> Bool {
        guard let cached = entry, cached.view === view else {
            return false
        }
        guard !cached.isStale else {
            expire()
            return false
        }

        startExpiryTimer(after: cached.remainingTTL)
        return true
    }

    func invalidate() {
        OSLogger.shared.debug("Invalidating preload cache")

        let cachedView = entry?.view
        stopKeepAlive()
        stopExpiryTimer()
        entry = nil

        cachedView?.detachBridge()
    }

    func hasEntry() -> Bool {
        if entry?.isStale == true {
            expire()
            return false
        }

        return entry != nil
    }

    func hasEntry(for key: PreloadKey) -> Bool {
        guard let entry, entry.key == key else {
            return false
        }

        if entry.isStale {
            expire()
            return false
        }

        return true
    }

    func contains(_ view: CheckoutWebView) -> Bool {
        guard let entry, !entry.isStale else {
            return false
        }

        return entry.view === view
    }

    func hasActiveKeepAlive() -> Bool {
        return keepAliveTimer != nil
    }

    func hasActiveExpiryTimer() -> Bool {
        return expiryTimer != nil
    }

    /// While the preloaded webview is unparented, WebKit can suspend its web process before
    /// the page finishes loading. Periodically evaluating a no-op keeps the process scheduled
    /// so the preloaded page can finish loading before it is presented. The 500ms cadence is
    /// empirical and intentionally conservative rather than a documented WebKit guarantee.
    private func startKeepAlive(for view: CheckoutWebView) {
        stopKeepAlive()
        let generation = UUID()
        keepAliveGeneration = generation
        keepAliveTimer = scheduler.schedule(after: Self.keepAliveInterval, repeats: true) { [weak self, weak view] in
            guard let self, let view, keepAliveGeneration == generation else { return }
            do {
                try await evaluateKeepAlive(view)
            } catch {
                // An in-flight evaluation can outlive replacement or presentation of its entry.
                guard keepAliveGeneration == generation else { return }
                OSLogger.shared.debug("Preload keep-alive failed; invalidating preload cache")
                keepAliveDidFail()
            }
        }
    }

    private func startExpiryTimer(after interval: TimeInterval) {
        stopExpiryTimer()
        let generation = UUID()
        expiryGeneration = generation
        expiryTimer = scheduler.schedule(after: interval, repeats: false) { [weak self] in
            guard let self, expiryGeneration == generation else { return }
            expire()
        }
    }

    func expire() {
        evict(with: .expired)
    }

    func keepAliveDidFail() {
        entry?.view.telemetry.recordError(
            .init(
                category: .navigation,
                stage: .load,
                code: .connectionLost,
                retryable: false,
                isRetry: false
            )
        )
        evict(with: .failed(
            reason: .webContentUnavailable,
            message: "Preload keep-alive failed."
        ))
    }

    private func stopKeepAlive() {
        keepAliveGeneration = nil
        keepAliveTimer?.cancel()
        keepAliveTimer = nil
    }

    private func stopExpiryTimer() {
        expiryGeneration = nil
        expiryTimer?.cancel()
        expiryTimer = nil
    }

    private static func preloadFrame() -> CGRect {
        let scene = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first { $0.activationState == .foregroundActive }
        return scene?.coordinateSpace.bounds ?? UIScreen.main.bounds
    }
}

@MainActor
protocol PreloadScheduledTask {
    func cancel()
}

@MainActor
protocol PreloadScheduling {
    func schedule(
        after interval: TimeInterval,
        repeats: Bool,
        action: @escaping @MainActor @Sendable () async -> Void
    ) -> any PreloadScheduledTask
}

@MainActor
private struct PreloadTimerScheduler: PreloadScheduling {
    func schedule(
        after interval: TimeInterval,
        repeats: Bool,
        action: @escaping @MainActor @Sendable () async -> Void
    ) -> any PreloadScheduledTask {
        let timer = Timer.scheduledTimer(withTimeInterval: interval, repeats: repeats) { _ in
            Task { @MainActor in await action() }
        }
        timer.tolerance = min(interval / 2, 1)
        return ScheduledTimer(timer: timer)
    }

    private struct ScheduledTimer: PreloadScheduledTask {
        let timer: Timer

        func cancel() {
            timer.invalidate()
        }
    }
}
