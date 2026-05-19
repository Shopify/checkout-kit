extension GraphQLDocument {
    enum Queries: String {
        case cart = """
        query GetCart($id: ID!) {
          cart(id: $id) {
            ...CartFragment
          }
        }
        """

        case shop = """
        query GetShop {
          shop {
            name
            description
            primaryDomain {
              host
              sslEnabled
              url
            }
            shipsToCountries
            paymentSettings {
              supportedDigitalWallets
              acceptedCardBrands
              countryCode
            }
            moneyFormat
          }
        }
        """
    }
}
