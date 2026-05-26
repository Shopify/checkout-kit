extension GraphQLDocument {
    enum Mutations: String, CaseIterable {
        case cartCreate = """
        mutation CartCreate($input: CartInput!) {
          cartCreate(input: $input) {
            cart {
              ...CartFragment
            }
            userErrors {
              ...CartUserErrorFragment
            }
          }
        }
        """

        case cartBuyerIdentityUpdate = """
        mutation CartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
          cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
            cart {
              ...CartFragment
            }
            userErrors {
              ...CartUserErrorFragment
            }
          }
        }
        """

        case cartDeliveryAddressesReplace = """
        mutation CartDeliveryAddressesReplace($cartId: ID!, $addresses: [CartSelectableAddressInput!]!) {
          cartDeliveryAddressesReplace(cartId: $cartId, addresses: $addresses) {
            cart {
              ...CartFragment
            }
            userErrors {
              ...CartUserErrorFragment
            }
          }
        }
        """

        case cartSelectedDeliveryOptionsUpdate = """
        mutation CartSelectedDeliveryOptionsUpdate($cartId: ID!, $selectedDeliveryOptions: [CartSelectedDeliveryOptionInput!]!) {
          cartSelectedDeliveryOptionsUpdate(cartId: $cartId, selectedDeliveryOptions: $selectedDeliveryOptions) {
            cart {
              ...CartFragment
            }
            userErrors {
              ...CartUserErrorFragment
            }
          }
        }
        """

        case cartPaymentUpdate = """
        mutation CartPaymentUpdate($cartId: ID!, $payment: CartPaymentInput!) {
          cartPaymentUpdate(cartId: $cartId, payment: $payment) {
            cart {
              ...CartFragment
            }
            userErrors {
              ...CartUserErrorFragment
            }
          }
        }
        """

        case cartBillingAddressUpdate = """
        mutation CartBillingAddressUpdate($cartId: ID!, $billingAddress: MailingAddressInput!) {
          cartBillingAddressUpdate(cartId: $cartId, billingAddress: $billingAddress) {
            cart {
              ...CartFragment
            }
            userErrors {
              ...CartUserErrorFragment
            }
          }
        }
        """

        case cartRemovePersonalData = """
        mutation CartRemovePersonalData($cartId: ID!) {
          cartRemovePersonalData(cartId: $cartId) {
            cart {
              ...CartFragment
            }
            userErrors {
              ...CartUserErrorFragment
            }
          }
        }
        """

        case cartPrepareForCompletion = """
        mutation CartPrepareForCompletion($cartId: ID!) {
          cartPrepareForCompletion(cartId: $cartId) {
            result {
              __typename
              ... on CartStatusReady {
                cart {
                  ...CartFragment
                }
              }
              ... on CartThrottled {
                pollAfter
              }
              ... on CartStatusNotReady {
                cart {
                  ...CartFragment
                }
                errors {
                  code
                  message
                }
              }
            }
            userErrors {
              ...CartUserErrorFragment
            }
          }
        }
        """

        case cartSubmitForCompletion = """
        mutation CartSubmitForCompletion($cartId: ID!, $attemptToken: String!) {
          cartSubmitForCompletion(cartId: $cartId, attemptToken: $attemptToken) {
            result {
              __typename
              ... on SubmitSuccess {
                redirectUrl
              }
              ... on SubmitFailed {
                checkoutUrl
                errors {
                  code
                  message
                }
              }
              ... on SubmitAlreadyAccepted {
                attemptId
              }
              ... on SubmitThrottled {
                pollAfter
              }
            }
            userErrors {
              ...CartUserErrorFragment
            }
          }
        }
        """
    }
}
