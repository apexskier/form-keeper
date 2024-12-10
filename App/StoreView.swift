import SafariServices
import StoreKit
import SwiftUI

struct StoreSheet: View {
    @Environment(\.dismiss) var dismiss

    @State private var freeTrialProduct: Product? = nil

    var body: some View {
        ScrollView {
            VStack {
                HStack {
                    Button {
                        dismiss()
                    } label: {
                        Label("Close", systemImage: "xmark")
                    }
                    .labelStyle(.iconOnly)
                    Spacer()
                }
                .padding()
                .buttonStyle(.borderless)

                if let freeTrialProduct,
                    let introOffer = freeTrialProduct.subscription?.introductoryOffer
                {
                    Button {
                        Task {
                            let result = try? await freeTrialProduct.purchase()
                            switch result {
                            case .success:
                                dismiss()
                            default:
                                break
                            }
                        }
                    } label: {
                        Text("Try it Free for \(introOffer.period)")
                    }
                    .buttonStyle(.borderedProminent)
                }

                if #available(macOS 15.0, *) {
                    StoreKit.StoreView(ids: productIDs)
                    .productViewStyle(.compact)
                    .storeButton(.visible, for: .restorePurchases)
                    .storeButton(.visible, for: .redeemCode)
                    .storeButton(.hidden, for: .cancellation)
                } else {
                    StoreKit.StoreView(ids: productIDs)
                    .productViewStyle(.compact)
                    .storeButton(.visible, for: .restorePurchases)
                    .storeButton(.hidden, for: .cancellation)
                }
            }
        }
        .task {
            guard
                let products = try? await Product.products(for: productIDs)
            else {
                return
            }
            for product in products {
                if let introOffer = product.subscription?.introductoryOffer,
                    introOffer.price == .zero
                {
                    if await product.subscription?.isEligibleForIntroOffer == true {
                        self.freeTrialProduct = product
                        return
                    }
                }
            }
        }
    }
}

#Preview("Sheet") {
    StoreSheet()
}

struct StoreView: View {
    @Binding var showStore: Bool

    @State private var paidActive: Bool? = nil

    var body: some View {
        VStack(spacing: 8) {
            if let paidActive {
                Text("\(appName) is \(paidActive ? "" : "not ")active")
                    .if(condition: paidActive == false) {
                        $0.bold()
                    }
            } else {
                ProgressView()
            }
            if paidActive == false {
                Button {
                    showStore = true
                } label: {
                    Label("Activate", systemImage: "cart")
                }
                .buttonStyle(.borderedProminent)
            } else {
                Button {
                    showStore = true
                } label: {
                    Label("Manage", systemImage: "cart")
                }
            }
        }
        .padding()
        .background(Material.thick)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        .sheet(isPresented: $showStore) {
            if #available(macOS 15.0, iOS 18.0, *) {
                StoreSheet()
                    .presentationSizing(.fitted)
            } else {
                StoreSheet()
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

                    paidActive = await isSubscriptionActive()
                }
            }
        }
    }
}

#Preview("View") {
    StoreView(showStore: .constant(false))
}
