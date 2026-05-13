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

package enum SwiftVersion {
    package static let current: String? = {
        #if swift(>=6.2)
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
