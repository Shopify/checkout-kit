import ShopifyAcceleratedCheckouts
import SwiftUI

struct SettingsButton: View {
    var body: some View {
        NavigationLink(
            destination: SettingsView()
        ) {
            Text("Settings")
        }
    }
}
