@preconcurrency import ShopifyCheckoutKit
import SwiftUI

struct LogsView: View {
    @State private var logs: [String?] = LogReader.shared.readLogs(limit: 100) ?? []

    var body: some View {
        VStack {
            List {
                if logs.isEmpty {
                    HStack {
                        Spacer()
                        Text("No logs available")
                            .font(.system(size: 12))
                            .padding()
                        Spacer()
                    }
                } else {
                    ForEach(logs, id: \.self) { log in
                        Text(log ?? "No log available")
                            .font(.system(size: 12))
                    }

                    HStack {
                        Spacer()
                        Button(action: clearLogs) {
                            Text("Clear logs")
                                .foregroundColor(.red)
                                .background(.white)
                                .font(.system(size: 12))
                        }
                        Spacer()
                    }
                }
            }
            .refreshable {
                logs = readLogs()
            }
        }
        .navigationTitle("Logs")
        .navigationBarItems(
            trailing: Button(action: clearLogs) {
                Text("Clear")
            }
        )
        .onAppear {
            logs = readLogs()
        }
    }

    private func clearLogs() {
        ShopifyCheckoutKit.configuration.logger.clearLogs()
        logs = readLogs()
    }

    private func readLogs() -> [String?] {
        return LogReader.shared.readLogs(limit: 100) ?? []
    }
}
