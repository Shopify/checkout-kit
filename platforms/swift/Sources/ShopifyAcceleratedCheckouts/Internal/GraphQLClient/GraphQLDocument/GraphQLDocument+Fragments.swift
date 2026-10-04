extension GraphQLDocument {
    enum Fragments: String, CaseIterable {
        case cart = """
        fragment CartFragment on Cart {
          id
          checkoutUrl
          totalQuantity
          buyerIdentity {
            email
            phone
            customer {
                email
                phone
            }
          }
          deliveryGroups(first: 10) {
            nodes {
              ...CartDeliveryGroupFragment
            }
          }
          delivery {
            addresses {
              id
              selected
              address {
                ... on CartDeliveryAddress {
                  address1
                  address2
                  city
                  countryCode
                  firstName
                  lastName
                  phone
                  provinceCode
                  zip
                }
              }
            }
          }
          lines(first: 250) {
            nodes {
              ...CartLineFragment
            }
          }
          cost {
            totalAmount {
              amount
              currencyCode
            }
            subtotalAmount {
              amount
              currencyCode
            }
            totalTaxAmount {
              amount
              currencyCode
            }
            totalDutyAmount {
              amount
              currencyCode
            }
          }
          discountApplications {
            targetType
            totalAllocatedAmount {
              amount
              currencyCode
            }
            ... on CartCodeDiscountApplication {
              code
            }
          }
        }
        """

        case cartDeliveryGroup = """
        fragment CartDeliveryGroupFragment on CartDeliveryGroup {
          id
          groupType
          deliveryOptions {
            handle
            title
            code
            deliveryMethodType
            description
            estimatedCost {
              amount
              currencyCode
            }
          }
          selectedDeliveryOption {
            handle
            title
            code
            deliveryMethodType
            description
            estimatedCost {
              amount
              currencyCode
            }
          }
        }
        """

        case cartLine = """
        fragment CartLineFragment on BaseCartLine {
          id
          quantity
          merchandise {
            ... on ProductVariant {
              id
              title
              price {
                amount
                currencyCode
              }
              product {
                title
                vendor
                featuredImage {
                  url
                }
              }
              requiresShipping
            }
          }
          cost {
            totalAmount {
              amount
              currencyCode
            }
            subtotalAmount {
              amount
              currencyCode
            }
          }
        }
        """

        case cartUserError = """
        fragment CartUserErrorFragment on CartUserError {
          code
          message
          field
        }
        """

        static var all: String {
            allCases.map(\.rawValue).joined(separator: "\n\n")
        }
    }
}
