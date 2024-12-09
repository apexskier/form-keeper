import SafariServices
import StoreKit
import SwiftUI

struct StoreView: View {
    @Binding var showStore: Bool

    @State private var paidActive: Bool? = nil

    var body: some View {
        VStack(spacing: 8) {
            if let paidActive {
                Text("\(appName) is \(paidActive ? "" : "not ")active")
            } else {
                ProgressView()
            }
            Button {
                showStore = true
            } label: {
                Label(paidActive == true ? "Manage" : "Activate", systemImage: "cart")
            }
        }
        .sheet(isPresented: $showStore) {
            if #available(macOS 15.0, iOS 17.0, *) {
                SubscriptionStoreView(groupID: subscriptionGroupID)
                    .storeButton(.visible, for: .restorePurchases, .redeemCode)
                    .presentationSizing(.fitted)
            } else {
                // Fallback on earlier versions
            }
        }
        .task {
            paidActive = await isSubscriptionActive()
        }
        .onAppear {
            Task(priority: .background) {
                for await verificationResult in Transaction.updates {
                    guard case .verified(let transaction) = verificationResult else {
                        // Ignore unverified transactions.
                        return
                    }

                    if transaction.revocationDate != nil {
                        // Remove access to the product identified by transaction.productID.
                        // Transaction.revocationReason provides details about
                        // the revoked transaction.
                        paidActive = false
                    } else if let expirationDate = transaction.expirationDate,
                        expirationDate < Date()
                    {
                        // Do nothing, this subscription is expired.
                        paidActive = false
                    } else if transaction.isUpgraded {
                        // Do nothing, there is an active transaction
                        // for a higher level of service.
                        return
                    } else {
                        // Provide access to the product identified by
                        // transaction.productID.
                        if transaction.subscriptionGroupID == subscriptionGroupID {
                            paidActive = true
                        }
                    }
                }
            }
        }
    }
}

#Preview {
    StoreView(showStore: .constant(false))
}
