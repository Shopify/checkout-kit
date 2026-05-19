import SwiftUI

extension Bundle {
    func localizedString(forKey key: String) -> String {
        localizedString(forKey: key, value: nil, table: nil)
    }
}

extension String {
    var localizedString: String {
        Bundle.acceleratedCheckouts.localizedString(forKey: self)
    }

    func localizedString(with arguments: CVarArg...) -> String {
        let format = Bundle.acceleratedCheckouts.localizedString(forKey: self)
        return String(format: format, arguments: arguments)
    }
}
