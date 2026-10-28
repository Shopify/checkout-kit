import UIKit
import WebKit

@MainActor
class CheckoutWebViewController: UIViewController, UIAdaptivePresentationControllerDelegate {
    /// Stable identifier consumed by React Native Maestro E2E tests.
    /// Keep this value in sync with the checkout close selector used by E2E flows.
    private static let closeButtonAccessibilityIdentifier = "shopify_checkout_kit_close_button"

    var onStart: ((CheckoutStartEvent) -> Void)?
    var onUpdate: ((CheckoutUpdateEvent) -> Void)?
    var onComplete: ((CheckoutCompleteEvent) -> Void)?
    var onLinkClick: ((CheckoutLink) -> CheckoutLinkAction)?
    var onDismiss: (() -> Void)?
    var onFail: ((CheckoutFailureEvent) -> Void)?
    weak var delegate: (any CheckoutDelegate)?

    var checkoutView: CheckoutWebView?

    lazy var progressBar: ProgressBarView = {
        let progressBar = ProgressBarView(frame: .zero, tintColor: colorScheme.color { $0.progressIndicatorColor })
        progressBar.translatesAutoresizingMaskIntoConstraints = false
        return progressBar
    }()

    var initialNavigation: Bool = true

    private let checkoutURL: URL
    private let configuration: Configuration
    private let colorScheme: CheckoutColorScheme

    private var closeBarButtonItem: UIBarButtonItem {
        let colors = colorScheme.colors(isDark: traitCollection.userInterfaceStyle == .dark)
        let item: UIBarButtonItem

        if colors.closeIcon != nil || colors.closeIconTintColor != nil {
            let defaultSymbolName: String
            if #available(iOS 26.0, *) {
                defaultSymbolName = "xmark"
            } else {
                defaultSymbolName = "xmark.circle.fill"
            }
            item = UIBarButtonItem(
                image: colors.closeIcon ?? UIImage(systemName: defaultSymbolName),
                style: .plain,
                target: self,
                action: #selector(close)
            )
            item.tintColor = colors.closeIconTintColor
        } else {
            item = UIBarButtonItem(
                barButtonSystemItem: .close,
                target: self,
                action: #selector(close)
            )
        }

        item.accessibilityIdentifier = Self.closeButtonAccessibilityIdentifier
        return item
    }

    var progressObserver: NSKeyValueObservation?
    private var hasNotifiedDismissal = false
    private var didComplete = false

    // MARK: Initializers

    public init(checkoutURL url: URL, configuration: Configuration = ShopifyCheckout.configuration, delegate: (any CheckoutDelegate)? = nil, client: (any CheckoutCommunicationProtocol)? = nil, entryPoint: MetaData.EntryPoint? = nil) {
        checkoutURL = url
        self.configuration = configuration
        colorScheme = configuration.appearance.effectiveColorScheme
        self.delegate = delegate

        let checkoutView = CheckoutWebView.for(checkout: url, entryPoint: entryPoint)
        checkoutView.isPresented = true
        checkoutView.applyColorScheme(colorScheme)
        checkoutView.translatesAutoresizingMaskIntoConstraints = false
        checkoutView.scrollView.contentInsetAdjustmentBehavior = .automatic
        self.checkoutView = checkoutView

        super.init(nibName: nil, bundle: nil)

        checkoutView.linkActionProvider = { [weak self] link in
            guard let self else { return .default }
            return onLinkClick?(link) ?? delegate?.checkoutAction(for: link) ?? .default
        }

        checkoutView.client = CheckoutEventAdapter(base: client, sink: self)

        overrideUserInterfaceStyle = colorScheme.userInterfaceStyle
        title = configuration.title

        navigationItem.rightBarButtonItem = closeBarButtonItem

        checkoutView.viewDelegate = self

        view.backgroundColor = colorScheme.color { $0.webViewBackgroundColor }

        if #available(iOS 17.0, *) {
            registerForTraitChanges([UITraitUserInterfaceStyle.self]) { (controller: CheckoutWebViewController, _) in
                controller.navigationItem.rightBarButtonItem = controller.closeBarButtonItem
            }
        }
    }

    @available(*, unavailable)
    required init?(coder _: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    // MARK: UIViewController Lifecycle

    @available(iOS, deprecated: 17.0)
    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)

        if #unavailable(iOS 17.0), previousTraitCollection?.userInterfaceStyle != traitCollection.userInterfaceStyle {
            navigationItem.rightBarButtonItem = closeBarButtonItem
        }
    }

    override public func viewDidLoad() {
        super.viewDidLoad()

        guard let checkoutView else { return }

        view.addSubview(checkoutView)
        NSLayoutConstraint.activate([
            checkoutView.topAnchor.constraint(equalTo: view.topAnchor),
            checkoutView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            checkoutView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            checkoutView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])

        view.addSubview(progressBar)
        NSLayoutConstraint.activate([
            progressBar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            progressBar.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor),
            progressBar.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor),
            progressBar.heightAnchor.constraint(equalToConstant: 1)
        ])
        view.bringSubviewToFront(progressBar)

        observeProgressChanges(checkoutView)
        loadCheckout()
    }

    override public func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)

        notifyDismissalAfterInteractiveDismissTransition()
    }

    override public func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)

        if isPresentationBeingDismissed || isMovingFromParent {
            cleanUpCheckoutView()
        }
    }

    /// Whether this controller, or a controller that contains it, is being dismissed.
    ///
    /// UIKit reports `isBeingDismissed` only on the presented controller. Checkout can be nested
    /// below it: in its own navigation controller, or inside the hosting controller of an app's
    /// SwiftUI `.sheet`.
    private var isPresentationBeingDismissed: Bool {
        sequence(first: self as UIViewController, next: \.parent).contains { $0.isBeingDismissed }
    }

    /// Reports a buyer's swipe-down when checkout runs inside a presentation it does not own.
    ///
    /// UIKit tells only the presentation controller's delegate about a swipe-down. For a SwiftUI
    /// `.sheet`, SwiftUI owns that delegate, so `presentationControllerDidDismiss(_:)` never runs
    /// here. The swipe drives an interactive dismissal transition, which this controller observes.
    /// A programmatic dismissal, such as an app setting `isPresented` to `false`, is not
    /// interactive and reports nothing, the same as in the UIKit entry point. A canceled swipe
    /// reports nothing either. A buyer's tap outside the sheet, such as on iPad, is not interactive
    /// either; from here it looks the same as a programmatic dismissal, so it also reports nothing.
    private func notifyDismissalAfterInteractiveDismissTransition() {
        guard isPresentationBeingDismissed,
              let transitionCoordinator,
              transitionCoordinator.initiallyInteractive
        else {
            return
        }

        transitionCoordinator.animate(alongsideTransition: nil) { [weak self] context in
            guard !context.isCancelled else { return }

            self?.didDismiss()
        }
    }

    func observeProgressChanges(_ view: WKWebView) {
        progressObserver = view.observe(\.estimatedProgress, options: [.new]) { [weak self] _, change in
            guard let self else { return }
            Task { @MainActor in
                if let newProgress = change.newValue {
                    let estimatedProgress = Float(newProgress)
                    self.progressBar.setProgress(estimatedProgress, animated: true)
                    if estimatedProgress < 1.0 {
                        self.progressBar.startAnimating()
                    } else {
                        self.progressBar.stopAnimating()
                    }
                }
            }
        }
    }

    private func loadCheckout() {
        guard let checkoutView else { return }

        if checkoutView.url == nil {
            initialNavigation = true
            checkoutView.load(checkout: checkoutURL)
            progressBar.startAnimating()
        } else if checkoutView.isLoading, initialNavigation {
            progressBar.startAnimating()
        }
    }

    @IBAction func close() {
        dismiss(animated: true) { [weak self] in
            self?.didDismiss()
        }
    }

    public func presentationControllerDidDismiss(_: UIPresentationController) {
        didDismiss()
    }

    private func didDismiss() {
        guard !hasNotifiedDismissal else { return }

        hasNotifiedDismissal = true
        onDismiss?()
        delegate?.checkoutDidDismiss()
    }

    func cleanUpCheckoutView() {
        progressObserver?.invalidate()
        progressObserver = nil

        recordConfirmationReached()

        checkoutView?.recordReadyDurationForDismissal()
        checkoutView?.isPresented = false

        if let checkoutView, CheckoutWebView.preloadCache.retainAfterPresentation(checkoutView) {
            checkoutView.viewDelegate = nil
            checkoutView.client = nil
            checkoutView.linkActionProvider = nil
            checkoutView.removeFromSuperview()
        } else {
            checkoutView?.cleanUpForDismissal()
        }

        checkoutView = nil
    }

    /// Measures how often a presentation ends on the confirmation page without `ec.complete`.
    ///
    /// A completed presentation is recorded even before the confirmation page loads, because
    /// `ec.complete` can precede that navigation and integrations often dismiss on completion.
    ///
    /// Counted once per view, not per presentation. `ec.complete` is what evicts a completed
    /// view from the preload cache, so when it is missing, a preloaded view can be presented
    /// again on the confirmation page, and each dismissal would record another `false`.
    private func recordConfirmationReached() {
        guard let checkoutView, !checkoutView.hasRecordedConfirmationReached else { return }
        let isOnConfirmationPage = checkoutView.url.map { CheckoutURL(from: $0).isConfirmationPage() } ?? false
        guard didComplete || isOnConfirmationPage else { return }

        checkoutView.hasRecordedConfirmationReached = true
        checkoutView.telemetry.recordConfirmationReached(.init(completionReceived: didComplete))
    }
}

extension CheckoutWebViewController: CheckoutEventSink {
    func checkoutDidStart(_ checkout: Checkout) {
        let event = CheckoutStartEvent(checkout: checkout)
        onStart?(event)
        delegate?.checkoutDidStart(event)
    }

    func checkoutDidUpdate(_ checkout: Checkout) {
        let event = CheckoutUpdateEvent(checkout: checkout)
        onUpdate?(event)
        delegate?.checkoutDidUpdate(event)
    }

    func checkoutDidComplete(_ checkout: Checkout) {
        didComplete = true
        let event = CheckoutCompleteEvent(checkout: checkout)
        onComplete?(event)
        delegate?.checkoutDidComplete(event)
    }
}

extension CheckoutWebViewController: CheckoutWebViewDelegate {
    func checkoutViewDidStartNavigation() {}

    func checkoutViewDidFinishNavigation() {
        initialNavigation = false
        progressBar.stopAnimating()
        let checkoutView = checkoutView
        UIView.animate(withDuration: UINavigationController.hideShowBarDuration) { [weak checkoutView] in
            checkoutView?.alpha = 1
        }
    }

    func checkoutViewDidFailWithError(error: CheckoutError) {
        let event = CheckoutFailureEvent(error: error)
        onFail?(event)
        delegate?.checkoutDidFail(event)
        dismiss(animated: true) { [weak self] in
            self?.didDismiss()
        }
    }
}
