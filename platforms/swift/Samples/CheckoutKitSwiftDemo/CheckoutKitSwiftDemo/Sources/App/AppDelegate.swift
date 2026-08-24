import ShopifyAcceleratedCheckouts
import ShopifyCheckoutKit
import UIKit

func getLogLevel(key: String) -> LogLevel {
    guard
        let rawLogLevel = UserDefaults.standard.string(
            forKey: key
        ),
        let logLevel = LogLevel(rawValue: rawLogLevel)
    else { return .debug }

    return logLevel
}

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(
        _: UIApplication,
        willFinishLaunchingWithOptions _: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        let checkoutKitLogLevel: LogLevel = getLogLevel(
            key: AppStorageKeys.checkoutKitLogLevel.rawValue
        )
        let acceleratedCheckoutsLogLevel: LogLevel = getLogLevel(
            key: AppStorageKeys.acceleratedCheckoutsLogLevel.rawValue
        )
        let checkoutPreloadingEnabled = UserDefaults.standard.object(
            forKey: AppStorageKeys.checkoutPreloadingEnabled.rawValue
        ) as? Bool ?? true

        ShopifyCheckoutKit.configure {
            $0.appearance = .app(.automatic)
            $0.tintColor = ColorPalette.primaryColor
            $0.logger = FileLogger("log.txt")
            $0.logLevel = checkoutKitLogLevel
            $0.preloading.enabled = checkoutPreloadingEnabled
        }
        ShopifyAcceleratedCheckouts.logLevel = acceleratedCheckoutsLogLevel

        print("[CheckoutKitSwiftDemo] CheckoutKit Log level set to \(checkoutKitLogLevel)")
        print(
            "[CheckoutKitSwiftDemo] Accelerated Checkouts Log level set to \(acceleratedCheckoutsLogLevel)"
        )

        UIBarButtonItem.appearance().tintColor = ColorPalette.primaryColor

        return true
    }

    func application(
        _: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession,
        options _: UIScene.ConnectionOptions
    ) -> UISceneConfiguration {
        return UISceneConfiguration(name: "Default", sessionRole: connectingSceneSession.role)
    }
}
