import UIKit
import WebKit

@MainActor
class CheckoutWebViewController: UIViewController, UIAdaptivePresentationControllerDelegate {
    /// Stable identifier consumed by React Native Maestro E2E tests.
    /// Keep this value in sync with the checkout close selector used by E2E flows.
    private static let closeButtonAccessibilityIdentifier = "shopify_checkout_kit_close_button"

    var onDismiss: (() -> Void)?
    var onFail: ((CheckoutError) -> Void)?
    weak var delegate: (any CheckoutDelegate)?
    var client: (any CheckoutCommunicationProtocol)?

    var checkoutView: CheckoutWebView?

    lazy var progressBar: ProgressBarView = {
        let progressBar = ProgressBarView(frame: .zero)
        progressBar.translatesAutoresizingMaskIntoConstraints = false
        return progressBar
    }()

    var initialNavigation: Bool = true

    private let checkoutURL: URL

    private lazy var closeBarButtonItem: UIBarButtonItem = {
        if let closeButtonTintColor = ShopifyCheckoutKit.configuration.closeButtonTintColor {
            var item: UIBarButtonItem

            if #available(iOS 26.0, *) {
                item = UIBarButtonItem(
                    image: UIImage(systemName: "xmark"),
                    style: .plain,
                    target: self,
                    action: #selector(close)
                )
            } else {
                item = UIBarButtonItem(
                    image: UIImage(systemName: "xmark.circle.fill"),
                    style: .plain,
                    target: self,
                    action: #selector(close)
                )
            }

            item.tintColor = closeButtonTintColor
            item.accessibilityIdentifier = Self.closeButtonAccessibilityIdentifier
            return item
        }

        let item = UIBarButtonItem(
            barButtonSystemItem: .close,
            target: self,
            action: #selector(close)
        )
        item.accessibilityIdentifier = Self.closeButtonAccessibilityIdentifier
        return item
    }()

    var progressObserver: NSKeyValueObservation?

    // MARK: Initializers

    public init(checkoutURL url: URL, delegate: (any CheckoutDelegate)? = nil, client: (any CheckoutCommunicationProtocol)? = nil, entryPoint: MetaData.EntryPoint? = nil) {
        checkoutURL = url
        self.delegate = delegate
        self.client = client

        let checkoutView = CheckoutWebView.for(checkout: url, entryPoint: entryPoint)
        checkoutView.translatesAutoresizingMaskIntoConstraints = false
        checkoutView.scrollView.contentInsetAdjustmentBehavior = .automatic
        checkoutView.client = client
        self.checkoutView = checkoutView

        super.init(nibName: nil, bundle: nil)

        title = ShopifyCheckoutKit.configuration.title

        navigationItem.rightBarButtonItem = closeBarButtonItem

        checkoutView.viewDelegate = self

        view.backgroundColor = ShopifyCheckoutKit.configuration.backgroundColor
    }

    @available(*, unavailable)
    required init?(coder _: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    // MARK: UIViewController Lifecycle

    override public func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)

        checkoutView?.checkoutIsVisible = true
        view.backgroundColor = ShopifyCheckoutKit.configuration.backgroundColor
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

    override public func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)

        checkoutView?.checkoutIsVisible = false
        if isBeingDismissed || navigationController?.isBeingDismissed == true || isMovingFromParent {
            cleanUpCheckoutView()
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
        didDismiss()
        dismiss(animated: true)
    }

    public func presentationControllerDidDismiss(_: UIPresentationController) {
        didDismiss()
    }

    private func didDismiss() {
        onDismiss?()
        delegate?.checkoutDidDismiss()
    }

    func cleanUpCheckoutView() {
        progressObserver?.invalidate()
        progressObserver = nil

        if let checkoutView, CheckoutWebView.preloadCache.retainAfterPresentation(checkoutView) {
            checkoutView.viewDelegate = nil
            checkoutView.client = nil
            checkoutView.removeFromSuperview()
        } else {
            checkoutView?.cleanUpForDismissal()
        }

        checkoutView = nil
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
        onFail?(error)
        delegate?.checkoutDidFail(error: error)
        dismiss(animated: true)
    }
}
