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

public enum CheckoutProtocol {
    public static let specVersion = "2026-04-08"

    public static let buyerChange = NotificationDescriptor<Checkout>(method: "ec.buyer.change")
    public static let complete = NotificationDescriptor<Checkout>(method: "ec.complete")
    public static let lineItemsChange = NotificationDescriptor<Checkout>(method: "ec.line_items.change")
    public static let messagesChange = NotificationDescriptor<Checkout>(method: "ec.messages.change")
    public static let paymentChange = NotificationDescriptor<Checkout>(method: "ec.payment.change")
    public static let start = NotificationDescriptor<Checkout>(method: "ec.start")
}
