import UIKit

// MARK: - UIColor Extensions

extension UIColor {
    convenience init(hex: String) {
        let hexString: String = hex.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines)
        let start = hexString.index(hexString.startIndex, offsetBy: hexString.hasPrefix("#") ? 1 : 0)
        let hexColor = String(hexString[start...])

        let scanner = Scanner(string: hexColor)
        var hexNumber: UInt64 = 0

        if scanner.scanHexInt64(&hexNumber) {
            let red = (hexNumber & 0xFF0000) >> 16
            let green = (hexNumber & 0x00FF00) >> 8
            let blue = hexNumber & 0x0000FF

            self.init(
                red: CGFloat(red) / 0xFF,
                green: CGFloat(green) / 0xFF,
                blue: CGFloat(blue) / 0xFF,
                alpha: 1
            )
        } else {
            self.init(red: 0, green: 0, blue: 0, alpha: 1)
        }
    }
}
