// @generated
// This file was automatically generated and should not be edited.

@_spi(Internal) @_spi(Unsafe) import ApolloAPI

extension Storefront {
  /// The parent line item of the cart line.
  struct CartLineParentInput: InputObject {
    private(set) var __data: InputDict

    init(_ data: InputDict) {
      __data = data
    }

    init(
      lineId: GraphQLNullable<ID> = nil,
      merchandiseId: GraphQLNullable<ID> = nil
    ) {
      __data = InputDict([
        "lineId": lineId,
        "merchandiseId": merchandiseId
      ])
    }

    /// The id of the parent line item.
    var lineId: GraphQLNullable<ID> {
      get { __data["lineId"] }
      set { __data["lineId"] = newValue }
    }

    /// The ID of the parent line merchandise.
    var merchandiseId: GraphQLNullable<ID> {
      get { __data["merchandiseId"] }
      set { __data["merchandiseId"] = newValue }
    }
  }

}
