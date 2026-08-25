import Combine
import ShopifyCheckoutKit
import SwiftUI
import UIKit

enum Screen: Int, CaseIterable {
    case catalog
    case products
    case cart
    case account
    case settings
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    var cancellables: Set<AnyCancellable> = []

    let uiKitCartController = CartViewController()
    let swiftUICartController = UIHostingController(rootView: CartView())
    let productGridController = UIHostingController(rootView: ProductGridView())
    let productGalleryController = UIHostingController(rootView: ProductGalleryView())
    let accountController = UIHostingController(rootView: AccountView())
    let settingsController = UIHostingController(rootView: SettingsView())

    // Store cart button items for badge updates.
    private var catalogCartButton: UIBarButtonItem?
    private var galleryCartButton: UIBarButtonItem?

    func scene(_ scene: UIScene, willConnectTo _: UISceneSession, options _: UIScene.ConnectionOptions) {
        guard let windowScene = (scene as? UIWindowScene) else { return }

        let tabBarController = UITabBarController()

        setupControllers()
        subscribeToCartUpdates()
        subscribeToColorSchemeChanges()

        var viewControllers: [UIViewController?] = Array(repeating: nil, count: Screen.allCases.count)

        // Catalog screen
        viewControllers[Screen.catalog.rawValue] = UINavigationController(rootViewController: productGridController)

        // Product gallery screen
        viewControllers[Screen.products.rawValue] = UINavigationController(rootViewController: productGalleryController)

        // Cart screen
        viewControllers[Screen.cart.rawValue] = UINavigationController(rootViewController: swiftUICartController)

        // Account screen
        viewControllers[Screen.account.rawValue] = UINavigationController(rootViewController: accountController)

        // Settings screen
        viewControllers[Screen.settings.rawValue] = UINavigationController(rootViewController: settingsController)

        tabBarController.viewControllers = viewControllers.compactMap { $0 }

        tabBarController.view.accessibilityIdentifier = AccessibilityIdentifiers.appReady

        let window = createWindow(windowScene: windowScene, rootViewController: tabBarController)

        CheckoutCoordinator.shared = CheckoutCoordinator(window: window)

        self.window = window
    }

    private func subscribeToColorSchemeChanges() {
        // Subscribe to color scheme changes on the settings screen
        NotificationCenter.default.addObserver(self, selector: #selector(colorSchemeChanged), name: .colorSchemeChanged, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(navigateToAccountTab), name: .navigateToAccount, object: nil)
    }

    @objc private func navigateToAccountTab() {
        navigateTo(.account)
    }

    private func setupControllers() {
        // Branding Logo
        let logoImageView = UIImageView(image: UIImage(named: "logo"))
        logoImageView.contentMode = .scaleAspectFit
        logoImageView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            logoImageView.widthAnchor.constraint(lessThanOrEqualToConstant: 90),
            logoImageView.heightAnchor.constraint(equalToConstant: 44)
        ])

        // Catalog grid view
        productGridController.tabBarItem.image = UIImage(systemName: "square.grid.2x2")
        productGridController.tabBarItem.title = "Catalog"
        productGridController.navigationItem.titleView = logoImageView
        catalogCartButton = createCartButtonWithBadge()
        productGridController.navigationItem.rightBarButtonItem = catalogCartButton

        // Product Gallery
        productGalleryController.tabBarItem.image = UIImage(systemName: "appwindow.swipe.rectangle")
        productGalleryController.tabBarItem.title = "Products"
        productGalleryController.navigationItem.titleView = logoImageView
        galleryCartButton = createCartButtonWithBadge()
        productGalleryController.navigationItem.rightBarButtonItem = galleryCartButton

        // Cart (UI Kit)
        swiftUICartController.tabBarItem.image = UIImage(systemName: "cart")
        swiftUICartController.tabBarItem.title = "Cart"
        swiftUICartController.tabBarItem.accessibilityIdentifier = AccessibilityIdentifiers.Tabs.cart
        swiftUICartController.navigationItem.title = "Cart (SwiftUI)"

        // Account
        accountController.tabBarItem.image = UIImage(systemName: "person.circle")
        accountController.tabBarItem.title = "Log in"
        subscribeToAuthStateChanges()

        // Settings
        settingsController.tabBarItem.image = UIImage(systemName: "gearshape.2")
        settingsController.tabBarItem.title = "Settings"
        settingsController.tabBarItem.accessibilityIdentifier = AccessibilityIdentifiers.Tabs.settings
    }

    private func subscribeToAuthStateChanges() {
        CustomerAccountManager.shared.$isAuthenticated
            .receive(on: DispatchQueue.main)
            .sink { [weak self] isAuthenticated in
                self?.accountController.tabBarItem.title = isAuthenticated ? "Account" : "Log in"
                self?.accountController.tabBarItem.image = UIImage(
                    systemName: isAuthenticated ? "person.circle.fill" : "person.circle"
                )
            }
            .store(in: &cancellables)
    }

    @objc public func present() {
        if let url = CartManager.shared.cart?.checkoutURL {
            presentCheckout(url)
        }
    }

    @objc public func presentUIKitCartInSheet() {
        // Wrap in navigation controller for better presentation
        let navigationController = UINavigationController(rootViewController: uiKitCartController)
        navigationController.modalPresentationStyle = .pageSheet

        // Add close button
        uiKitCartController.navigationItem.title = "Cart (UIKit)"
        uiKitCartController.navigationItem.rightBarButtonItem = UIBarButtonItem(
            barButtonSystemItem: .close,
            target: self,
            action: #selector(dismissCartSheet)
        )

        // Present from the top-most view controller
        if let topViewController = window?.topMostViewController() {
            topViewController.present(navigationController, animated: true)
        }
    }

    @objc private func dismissCartSheet() {
        window?.topMostViewController()?.dismiss(animated: true)
    }

    private func createWindow(windowScene: UIWindowScene, rootViewController: UIViewController) -> UIWindow {
        let window = UIWindow(windowScene: windowScene)
        window.rootViewController = rootViewController
        window.makeKeyAndVisible()
        window.tintColor = ColorPalette.primaryColor
        window.overrideUserInterfaceStyle = ShopifyCheckoutKit.configuration.appearance.userInterfaceStyle
        return window
    }

    private func subscribeToCartUpdates() {
        CartManager.shared.$cart
            .sink { cart in
                if let cart, cart.lines.nodes.count > 0 {
                    DispatchQueue.main.async {
                        self.swiftUICartController.tabBarItem.badgeValue = "\(cart.totalQuantity)"
                        self.updateCartButtonBadges(count: Int(cart.totalQuantity))
                    }
                } else {
                    self.swiftUICartController.tabBarItem.badgeValue = nil
                    self.updateCartButtonBadges(count: 0)
                }
            }
            .store(in: &cancellables)
    }

    private func createCartButtonWithBadge() -> UIBarButtonItem {
        if #available(iOS 26.0, *) {
            let button = UIBarButtonItem(
                image: UIImage(systemName: "cart"),
                style: .plain,
                target: self,
                action: #selector(presentUIKitCartInSheet)
            )
            button.tintColor = ColorPalette.primaryColor
            return button
        }

        let containerView = UIView()
        containerView.frame = CGRect(x: 0, y: 0, width: 44, height: 44)

        let button = UIButton(type: .system)
        button.setImage(UIImage(systemName: "cart"), for: .normal)
        button.tintColor = ColorPalette.primaryColor
        button.frame = CGRect(x: 0, y: 0, width: 44, height: 44)
        button.addTarget(self, action: #selector(presentUIKitCartInSheet), for: .touchUpInside)

        let badgeLabel = UILabel()
        badgeLabel.backgroundColor = .systemRed
        badgeLabel.textColor = .white
        badgeLabel.font = UIFont.systemFont(ofSize: 12, weight: .bold)
        badgeLabel.textAlignment = .center
        badgeLabel.layer.cornerRadius = 10
        badgeLabel.clipsToBounds = true
        badgeLabel.frame = CGRect(x: 25, y: 5, width: 20, height: 20)
        badgeLabel.isHidden = true
        badgeLabel.tag = ElementTags.cartBadgeLabel

        containerView.addSubview(button)
        containerView.addSubview(badgeLabel)

        return UIBarButtonItem(customView: containerView)
    }

    private func updateCartButtonBadges(count: Int) {
        if #available(iOS 26.0, *) {
            catalogCartButton?.badge = count > 0 ? .count(count) : nil
            galleryCartButton?.badge = count > 0 ? .count(count) : nil
        } else {
            updateLegacyCartButtonBadge(in: catalogCartButton, count: count)
            updateLegacyCartButtonBadge(in: galleryCartButton, count: count)
        }
    }

    private func updateLegacyCartButtonBadge(in barButtonItem: UIBarButtonItem?, count: Int) {
        guard let badgeLabel = barButtonItem?.customView?.viewWithTag(ElementTags.cartBadgeLabel) as? UILabel else {
            return
        }

        badgeLabel.text = count > 0 ? "\(count)" : ""
        badgeLabel.isHidden = count <= 0
    }

    func scene(_: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let url = URLContexts.first?.url else { return }

        Task { await E2EController.shared.handle(url: url.absoluteString) }
    }

    func scene(_: UIScene, continue userActivity: NSUserActivity) {
        guard
            userActivity.activityType == NSUserActivityTypeBrowsingWeb,
            let incomingURL = userActivity.webpageURL,

            // Ensure URL host matches our Storefront domain
            let host = incomingURL.host, host == appConfiguration.storefrontDomain
        else {
            return
        }

        handleUniversalLink(url: incomingURL)
    }

    func handleUniversalLink(url: URL) {
        let storefrontUrl = StorefrontURL(from: url)

        switch true {
        // Checkout URLs
        case appConfiguration.universalLinks.checkout && storefrontUrl.isCheckout() && !storefrontUrl.isThankYouPage():
            presentCheckout(url)
        // Cart URLs
        case appConfiguration.universalLinks.cart && storefrontUrl.isCart():
            navigateTo(.cart)
        // Product URLs
        case appConfiguration.universalLinks.products:
            if let slug = storefrontUrl.getProductSlug() {
                navigateToProduct(with: slug)
            }
        // Open everything else in Safari
        default:
            UIApplication.shared.open(url)
        }
    }

    public func presentCheckout(_ url: URL) {
        CheckoutCoordinator.shared?.present(checkout: url)
    }

    func navigateTo(_ screen: Screen) {
        if let tabBarVC = window?.rootViewController as? UITabBarController {
            tabBarVC.selectedIndex = screen.rawValue
        }
    }

    func navigateToProduct(with handle: String) {
        ProductCache.shared.getProduct(handle: handle, completion: { _ in })
        navigateTo(.catalog)
    }

    @objc func colorSchemeChanged() {
        window?.overrideUserInterfaceStyle = ShopifyCheckoutKit.configuration.appearance.userInterfaceStyle
    }

    private func getRootViewController() -> UINavigationController? {
        return window?.rootViewController as? UINavigationController
    }

    private func getNavigationController(forTab index: Int) -> UINavigationController? {
        guard let tabBarVC = window?.rootViewController as? UITabBarController else {
            return nil
        }
        return tabBarVC.viewControllers?[index] as? UINavigationController
    }
}

extension Notification.Name {
    static let colorSchemeChanged = Notification.Name("colorSchemeChanged")
    static let navigateToAccount = Notification.Name("navigateToAccount")
}

extension Configuration.ColorScheme {
    var userInterfaceStyle: UIUserInterfaceStyle {
        switch self {
        case .light:
            return .light
        case .dark:
            return .dark
        default:
            return .unspecified
        }
    }
}

extension Configuration.Appearance {
    var userInterfaceStyle: UIUserInterfaceStyle {
        switch self {
        case let .app(colorScheme):
            return colorScheme.userInterfaceStyle
        case .storefront:
            return Configuration.ColorScheme.light.userInterfaceStyle
        }
    }
}

extension UIWindow {
    /// Function to get the top most view controller from the window's rootViewController
    func topMostViewController() -> UIViewController? {
        guard var topController = rootViewController else {
            return nil
        }

        while let presentedViewController = topController.presentedViewController {
            topController = presentedViewController
        }

        return topController
    }
}

enum ElementTags {
    static let cartBadgeLabel = 999
}
