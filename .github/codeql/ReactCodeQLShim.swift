// Provides the minimal React types needed to compile the Swift wrapper without its dependency graph.
// This module is built before CodeQL starts, so the shim itself is not analyzed.

import Foundation
import UIKit

public typealias RCTDirectEventBlock = ([AnyHashable: Any]?) -> Void
public typealias RCTBubblingEventBlock = ([AnyHashable: Any]?) -> Void

open class RCTViewManager: NSObject {
    open func view() -> UIView! {
        nil
    }

    open class func requiresMainQueueSetup() -> Bool {
        false
    }

    open func constantsToExport() -> [AnyHashable: Any]! {
        nil
    }
}
