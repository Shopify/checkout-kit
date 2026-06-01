import Foundation

final class LogReader: Sendable {
    static let shared = LogReader("log.txt")

    private let logFileUrl: URL

    private init(_ filename: String) {
        let paths = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)
        logFileUrl = paths[0].appendingPathComponent(filename)
    }

    func readLogs(limit: Int = 100) -> [String?]? {
        do {
            let logContent = try String(contentsOf: logFileUrl, encoding: .utf8)
            var logLines = logContent.split(separator: "\n").map { String($0) }
            logLines = Array(logLines.suffix(limit))
            return logLines.reversed()
        } catch {
            print("Couldn't read the log file")
            return []
        }
    }
}
