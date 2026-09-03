// @generated
// This file was automatically generated and should not be edited.

import ApolloAPI

nonisolated protocol Storefront_SelectionSet: ApolloAPI.SelectionSet & ApolloAPI.RootSelectionSet
where Schema == Storefront.SchemaMetadata {}

nonisolated protocol Storefront_InlineFragment: ApolloAPI.SelectionSet & ApolloAPI.InlineFragment
where Schema == Storefront.SchemaMetadata {}

nonisolated protocol Storefront_MutableSelectionSet: ApolloAPI.MutableRootSelectionSet
where Schema == Storefront.SchemaMetadata {}

nonisolated protocol Storefront_MutableInlineFragment: ApolloAPI.MutableSelectionSet & ApolloAPI.InlineFragment
where Schema == Storefront.SchemaMetadata {}

extension Storefront {
  typealias SelectionSet = Storefront_SelectionSet

  typealias InlineFragment = Storefront_InlineFragment

  typealias MutableSelectionSet = Storefront_MutableSelectionSet

  typealias MutableInlineFragment = Storefront_MutableInlineFragment

  nonisolated enum SchemaMetadata: ApolloAPI.SchemaMetadata {
    static let configuration: any ApolloAPI.SchemaConfiguration.Type = SchemaConfiguration.self

    private static let objectTypeMap: [String: ApolloAPI.Object] = [
      "AppliedGiftCard": Storefront.Objects.AppliedGiftCard,
      "Article": Storefront.Objects.Article,
      "BaseCartLineConnection": Storefront.Objects.BaseCartLineConnection,
      "Blog": Storefront.Objects.Blog,
      "Cart": Storefront.Objects.Cart,
      "CartBuyerIdentity": Storefront.Objects.CartBuyerIdentity,
      "CartCost": Storefront.Objects.CartCost,
      "CartCreatePayload": Storefront.Objects.CartCreatePayload,
      "CartDeliveryGroup": Storefront.Objects.CartDeliveryGroup,
      "CartDeliveryGroupConnection": Storefront.Objects.CartDeliveryGroupConnection,
      "CartDeliveryOption": Storefront.Objects.CartDeliveryOption,
      "CartLine": Storefront.Objects.CartLine,
      "CartLineCost": Storefront.Objects.CartLineCost,
      "CartLinesAddPayload": Storefront.Objects.CartLinesAddPayload,
      "CartLinesUpdatePayload": Storefront.Objects.CartLinesUpdatePayload,
      "CartUserError": Storefront.Objects.CartUserError,
      "Collection": Storefront.Objects.Collection,
      "CollectionConnection": Storefront.Objects.CollectionConnection,
      "Comment": Storefront.Objects.Comment,
      "Company": Storefront.Objects.Company,
      "CompanyContact": Storefront.Objects.CompanyContact,
      "CompanyLocation": Storefront.Objects.CompanyLocation,
      "ComponentizableCartLine": Storefront.Objects.ComponentizableCartLine,
      "Customer": Storefront.Objects.Customer,
      "CustomerUserError": Storefront.Objects.CustomerUserError,
      "ExternalVideo": Storefront.Objects.ExternalVideo,
      "GenericFile": Storefront.Objects.GenericFile,
      "Image": Storefront.Objects.Image,
      "Location": Storefront.Objects.Location,
      "MailingAddress": Storefront.Objects.MailingAddress,
      "Market": Storefront.Objects.Market,
      "MediaImage": Storefront.Objects.MediaImage,
      "MediaPresentation": Storefront.Objects.MediaPresentation,
      "Menu": Storefront.Objects.Menu,
      "MenuItem": Storefront.Objects.MenuItem,
      "Metafield": Storefront.Objects.Metafield,
      "MetafieldDeleteUserError": Storefront.Objects.MetafieldDeleteUserError,
      "MetafieldsSetUserError": Storefront.Objects.MetafieldsSetUserError,
      "Metaobject": Storefront.Objects.Metaobject,
      "Model3d": Storefront.Objects.Model3d,
      "MoneyV2": Storefront.Objects.MoneyV2,
      "Mutation": Storefront.Objects.Mutation,
      "Order": Storefront.Objects.Order,
      "Page": Storefront.Objects.Page,
      "Product": Storefront.Objects.Product,
      "ProductConnection": Storefront.Objects.ProductConnection,
      "ProductOption": Storefront.Objects.ProductOption,
      "ProductOptionValue": Storefront.Objects.ProductOptionValue,
      "ProductVariant": Storefront.Objects.ProductVariant,
      "ProductVariantConnection": Storefront.Objects.ProductVariantConnection,
      "QueryRoot": Storefront.Objects.QueryRoot,
      "SearchQuerySuggestion": Storefront.Objects.SearchQuerySuggestion,
      "SellingPlan": Storefront.Objects.SellingPlan,
      "SellingPlanAllocation": Storefront.Objects.SellingPlanAllocation,
      "SellingPlanAllocationConnection": Storefront.Objects.SellingPlanAllocationConnection,
      "Shop": Storefront.Objects.Shop,
      "ShopPayInstallmentsFinancingPlan": Storefront.Objects.ShopPayInstallmentsFinancingPlan,
      "ShopPayInstallmentsFinancingPlanTerm": Storefront.Objects.ShopPayInstallmentsFinancingPlanTerm,
      "ShopPayInstallmentsProductVariantPricing": Storefront.Objects.ShopPayInstallmentsProductVariantPricing,
      "ShopPolicy": Storefront.Objects.ShopPolicy,
      "TaxonomyCategory": Storefront.Objects.TaxonomyCategory,
      "UrlRedirect": Storefront.Objects.UrlRedirect,
      "UserError": Storefront.Objects.UserError,
      "UserErrorsShopPayPaymentRequestSessionUserErrors": Storefront.Objects.UserErrorsShopPayPaymentRequestSessionUserErrors,
      "Video": Storefront.Objects.Video
    ]

    static func objectType(forTypename typename: String) -> ApolloAPI.Object? {
      objectTypeMap[typename]
    }
  }

  nonisolated enum Objects {}
  nonisolated enum Interfaces {}
  nonisolated enum Unions {}

}
