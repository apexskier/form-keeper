import StoreKit

let monthlyProductID = "activate.monthly"
let annualProductID = "activate.annual"
let lifetimeProductID = "activate.lifetime"
let productIDs = [monthlyProductID, annualProductID, lifetimeProductID]
let subscriptionID = "21604956"

func isSubscriptionActive() async -> Bool {
    guard
        let products = try? await Product.products(for: productIDs)
    else {
        return false
    }

    for product in products {
        let entitlement = await product.currentEntitlement
        switch entitlement {
        case .verified:
            return true
        case .unverified(_, let error):
            print("Subscription is not active: \(error.localizedDescription)")
        case .none:
            break
        }
    }

    return false
}
