import StoreKit

let subscriptionGroupID = "CD8720D7"

func isSubscriptionActive() async -> Bool {
    guard
        let products = try? await Product.products(for: [
            "activate.annual", "activate.monthly", "activate.lifetime",
        ])
    else {
        return false
    }

    for product in products {
        let entitlement = await product.currentEntitlement
        switch entitlement {
        case .verified(let transaction):
            if transaction.subscriptionGroupID == subscriptionGroupID
                || transaction.productID == "activate.lifetime"
            {
                return true
            }
        case .unverified(_, let error):
            print("Subscription is not active: \(error.localizedDescription)")
        case .none:
            break
        }
    }

    return false
}
