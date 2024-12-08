import StoreKit
import SwiftUI

struct StoreView: View {
    var body: some View {
        VStack {
            if #available(macOS 15.0, iOS 17.0, *) {
                SubscriptionStoreView(groupID: "CD8720D7")
                    .storeButton(.visible, for: .restorePurchases, .redeemCode)
            } else {
                // Fallback on earlier versions
            }
        }
    }
}

#Preview {
    StoreView()
}
