import SafariServices
import StoreKit
import SwiftUI

let subscriptionGroupID = "CD8720D7"

struct StoreView: View {
    @Binding var showStore: Bool

    @State private var subscriptionActive: Bool? = nil {
        didSet {
            if let subscriptionActive {
                SFSafariApplication.dispatchMessage(
                    withName: "subscriptionActive",
                    toExtensionWithIdentifier: extensionBundleIdentifier,
                    userInfo: ["subscriptionActive": subscriptionActive]
                ) { error in
                    if let error {
                        debugPrint("Failed to message extension: \(error))")
                    }
                }
            }
        }
    }

    var body: some View {
        VStack(spacing: 8) {
            if let subscriptionActive {
                Text("Subscription is \(subscriptionActive ? "" : "not ")active")
            } else {
                ProgressView()
            }
            Button {
                subscriptionActive?.toggle()
            } label: {
                Text("Send debug message")
            }
            Button {
                showStore = true
            } label: {
                Label("Open Store", systemImage: "cart")
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
            guard
                let products = try? await Product.products(for: [
                    "activate.annual", "activate.monthly",
                ])
            else {
                return
            }

            for product in products {
                let entitlement = await product.currentEntitlement
                switch entitlement {
                case .verified(let transaction):
                    if transaction.subscriptionGroupID == subscriptionGroupID {
                        subscriptionActive = true
                    }
                case .unverified(_, let error):
                    print("Subscription is not active: \(error.localizedDescription)")
                case .none:
                    break
                }
            }

            subscriptionActive = false
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
                        subscriptionActive = false
                    } else if let expirationDate = transaction.expirationDate,
                        expirationDate < Date()
                    {
                        // Do nothing, this subscription is expired.
                        subscriptionActive = false
                    } else if transaction.isUpgraded {
                        // Do nothing, there is an active transaction
                        // for a higher level of service.
                        return
                    } else {
                        // Provide access to the product identified by
                        // transaction.productID.
                        if transaction.subscriptionGroupID == subscriptionGroupID {
                            subscriptionActive = true
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
