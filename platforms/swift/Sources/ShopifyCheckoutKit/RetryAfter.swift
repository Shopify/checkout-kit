import Foundation

enum RetryAfter {
    private static let dateFormats = [
        "EEE, dd MMM yyyy HH:mm:ss zzz",
        "EEEE, dd-MMM-yy HH:mm:ss zzz",
        "EEE MMM d HH:mm:ss yyyy"
    ]

    static func seconds(from response: HTTPURLResponse, now: Date = Date()) -> TimeInterval? {
        seconds(from: response.value(forHTTPHeaderField: "Retry-After"), now: now)
    }

    static func seconds(from value: String?, now: Date = Date()) -> TimeInterval? {
        guard let value = value?.trimmingCharacters(in: .whitespacesAndNewlines), !value.isEmpty else {
            return nil
        }

        if let delay = TimeInterval(value), delay >= 0 {
            return delay
        }

        for format in dateFormats {
            let formatter = DateFormatter()
            formatter.calendar = Calendar(identifier: .gregorian)
            formatter.locale = Locale(identifier: "en_US_POSIX")
            formatter.timeZone = TimeZone(secondsFromGMT: 0)
            formatter.dateFormat = format
            formatter.isLenient = false

            if let date = formatter.date(from: value) {
                return ceil(max(0, date.timeIntervalSince(now)))
            }
        }

        return nil
    }
}
