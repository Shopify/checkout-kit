/*
 MIT License

 Copyright 2023 - Present, Shopify Inc.

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import Foundation

enum CasingTransform {
    static func snakeToCamel(_ s: String) -> String {
        guard !s.isEmpty else { return s }
        let parts = s.split(separator: "_", omittingEmptySubsequences: false)
        guard let first = parts.first else { return s }
        let head = String(first)
        let tail = parts.dropFirst().map { part -> String in
            guard let initial = part.first else { return "" }
            return initial.uppercased() + part.dropFirst()
        }
        return ([head] + tail).joined()
    }

    static func camelToSnake(_ s: String) -> String {
        guard !s.isEmpty else { return s }
        var result = ""
        for character in s {
            if character.isUppercase {
                if !result.isEmpty {
                    result.append("_")
                }
                result.append(character.lowercased())
            } else {
                result.append(character)
            }
        }
        return result
    }

    static func transformKeys(_ value: Any, _ fn: (String) -> String) -> Any {
        if let dict = value as? [String: Any] {
            var transformed: [String: Any] = [:]
            for (key, item) in dict {
                transformed[fn(key)] = transformKeys(item, fn)
            }
            return transformed
        }
        if let array = value as? [Any] {
            return array.map { transformKeys($0, fn) }
        }
        return value
    }

    static func encodeForJS(_ payload: some Encodable) throws -> String {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let data = try encoder.encode(payload)
        let object = try JSONSerialization.jsonObject(with: data, options: [.fragmentsAllowed])
        let transformed = transformKeys(object, snakeToCamel)
        let outputData = try JSONSerialization.data(withJSONObject: transformed, options: [.fragmentsAllowed])
        guard let string = String(data: outputData, encoding: .utf8) else {
            throw CasingTransformError.invalidUTF8
        }
        return string
    }

    static func decodeFromJS<T: Decodable>(_ json: String, as type: T.Type) throws -> T {
        guard let data = json.data(using: .utf8) else {
            throw CasingTransformError.invalidUTF8
        }
        let object = try JSONSerialization.jsonObject(with: data, options: [.fragmentsAllowed])
        let transformed = transformKeys(object, camelToSnake)
        let snakeData = try JSONSerialization.data(withJSONObject: transformed, options: [.fragmentsAllowed])
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(type, from: snakeData)
    }
}

enum CasingTransformError: Error {
    case invalidUTF8
}
