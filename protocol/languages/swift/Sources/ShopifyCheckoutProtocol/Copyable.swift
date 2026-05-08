//
//  Copy.swift
//  ShopifyCheckoutProtocol
//
//  Created by Kieran Barrie Osgood on 13/02/2026.
//

protocol Copyable {
    func copy(_ mutate: (inout Self) -> Void) -> Self
}

extension Copyable {
    func copy(_ mutate: (inout Self) -> Void) -> Self {
        var copy = self
        mutate(&copy)
        return copy
    }
}
