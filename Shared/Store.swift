import StoreKit

let productIDs = ["activate.monthly", "activate.annual", "activate.lifetime"]

func isSubscriptionActive() async -> Bool {
    guard
        let products = try? await Product.products(for: productIDs)
    else {
        return false
    }

    for product in products {
        let entitlement = await product.currentEntitlement
        switch entitlement {
        case .verified(let transaction):
            return true
        case .unverified(_, let error):
            print("Subscription is not active: \(error.localizedDescription)")
        case .none:
            break
        }
    }

    return false
}
