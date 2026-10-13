import Foundation

package enum SwiftVersion {
    package static let current: String? = {
        #if swift(>=7.0)
            return "7.0"
        #elseif swift(>=6.9)
            return "6.9"
        #elseif swift(>=6.8)
            return "6.8"
        #elseif swift(>=6.7)
            return "6.7"
        #elseif swift(>=6.6)
            return "6.6"
        #elseif swift(>=6.5)
            return "6.5"
        #elseif swift(>=6.4)
            return "6.4"
        #elseif swift(>=6.3)
            return "6.3"
        #elseif swift(>=6.2)
            return "6.2"
        #elseif swift(>=6.1)
            return "6.1"
        #elseif swift(>=6.0)
            return "6.0"
        #elseif swift(>=5.10)
            return "5.10"
        #elseif swift(>=5.9)
            return "5.9"
        #elseif swift(>=5.8)
            return "5.8"
        #elseif swift(>=5.7)
            return "5.7"
        #elseif swift(>=5.6)
            return "5.6"
        #elseif swift(>=5.5)
            return "5.5"
        #elseif swift(>=5.4)
            return "5.4"
        #elseif swift(>=5.3)
            return "5.3"
        #elseif swift(>=5.2)
            return "5.2"
        #elseif swift(>=5.1)
            return "5.1"
        #elseif swift(>=5.0)
            return "5.0"
        #elseif swift(>=4.2)
            return "4.2"
        #elseif swift(>=4.1)
            return "4.1"
        #elseif swift(>=4.0)
            return "4.0"
        #else
            return nil
        #endif
    }()
}
