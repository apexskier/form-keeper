import SafariServices
import StoreKit
import SwiftUI

extension Product.SubscriptionPeriod {
    var displayValue: String {
        switch self {
        case .monthly: return "Every Month"
        case .yearly: return "Every Year"
        case .everySixMonths: return "Twice a Year"
        case .everyTwoWeeks: return "Every Two Weeks"
        case .everyThreeDays: return "Every Three Days"
        case .everyTwoMonths: return "Every Two Months"
        case .weekly: return "Every Week"
        case .everyThreeMonths: return "Every Three Months"
        default:
            fatalError()
        }
    }
}

extension EdgeInsets {
    init(horizontal: CGFloat, vertical: CGFloat) {
        self.init(top: vertical, leading: horizontal, bottom: vertical, trailing: horizontal)
    }
}

enum PurchaseError: LocalizedError {
    case lifetimePurchased
    case subscriptionWillRenew
    case purchaseFailure(VerificationResult<StoreKit.Transaction>.VerificationError)

    var errorDescription: String? {
        switch self {
        case .lifetimePurchased:
            return "You've already purchased the lifetime activation."
        case .subscriptionWillRenew:
            return "You already have an active subscription."
        case .purchaseFailure:
            return "Purchase Failed"
        }
    }

    var errorMessage: String {
        switch self {
        case .lifetimePurchased:
            return "A subscription isn't necessary."
        case .subscriptionWillRenew:
            return
                "We can't automatically cancel your active subscription, to avoid multiple charges please cancel your subscription first."
        case .purchaseFailure(let error):
            return error.localizedDescription
        }
    }
}

func verifyProduct(product: Product) async throws {
    if product.subscription != nil {
        if let lifetimeProduct =
            try await Product.products(for: [lifetimeProductID])
            .first
        {
            let lifetimeEntitlement = await lifetimeProduct.currentEntitlement
            if case .verified = lifetimeEntitlement {
                throw PurchaseError.lifetimePurchased
            }
        }
    } else if product.id == lifetimeProductID {
        let subscriptionProducts = try await Product.products(for: [
            monthlyProductID, annualProductID,
        ])
        for product in subscriptionProducts {
            guard let subscriptionStatus = try await product.subscription?.status else {
                continue
            }
            if try subscriptionStatus.contains(where: { status in
                try status.renewalInfo.payloadValue.willAutoRenew
            }) {
                throw PurchaseError.subscriptionWillRenew
            }
        }
    }
}

struct ProductView: View {
    @Environment(\.purchase) private var purchase: PurchaseAction

    var product: Product
    var currentEntitlement: StoreKit.Transaction? = nil
    var disablePromo: Bool

    private var promo: Product.SubscriptionOffer? {
        if disablePromo || currentEntitlement != nil {
            return nil
        }
        return product.subscription?.introductoryOffer
            ?? product.subscription?.promotionalOffers.first
    }

    @State private var error: PurchaseError? = nil
    @State private var isShowingError = false

    private var innerPadding: Edge.Set {
        currentEntitlement != nil ? [.horizontal, .bottom] : .all
    }

    var body: some View {
        Group {
            VStack(spacing: 0) {
                if currentEntitlement != nil {
                    Text("Currently Active")
                        .frame(maxWidth: .infinity)
                        .padding(4)
                        .background(Color.secondary)
                        .foregroundStyle(.white)
                        .padding(4)
                }
                VStack(alignment: .center, spacing: 4) {
                    if let promo {
                        Text(
                            "\(promo.price.isZero ? "Free" : "for \(promo.displayPrice)") for \(promo.period)"
                        )
                        .bold()
                        .multilineTextAlignment(.center)
                        Spacer(minLength: 0)
                    }

                    Text(product.displayName)
                    if !product.description.isEmpty {
                        Text(product.description)
                            .multilineTextAlignment(.center)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }

                    Spacer(minLength: 0)

                    VStack {
                        HStack {
                            Button {
                                Task {
                                    do {
                                        try await verifyProduct(product: product)
                                        switch try await purchase(product) {
                                        case .success(let verificationResult):
                                            switch verificationResult {
                                            case .verified(let transaction):
                                                await transaction.finish()
                                            case .unverified(_, let error):
                                                throw PurchaseError.purchaseFailure(error)
                                            }
                                        default:
                                            break
                                        }
                                    } catch {
                                        guard let error = error as? PurchaseError else {
                                            return
                                        }
                                        self.error = error
                                        isShowingError = true
                                    }
                                }
                            } label: {
                                VStack {
                                    Text(product.displayPrice)
                                        .font(.headline)
                                }
                                .padding(EdgeInsets(horizontal: 16, vertical: 4))
                                .background(Color.white)
                                .foregroundColor(.accentColor)
                                .clipShape(RoundedRectangle(cornerRadius: 20))
                            }
                            .buttonStyle(.plain)
                        }
                        Group {
                            if let subscription = product.subscription {
                                Text(subscription.subscriptionPeriod.displayValue)
                            } else {
                                Text("Once!")
                            }
                        }
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
                .padding(innerPadding)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .background(Material.thin)
            .if(promo != nil) {
                $0.border(Color.accentColor, width: 4)
            }
            .if(currentEntitlement != nil) {
                $0.border(Color.secondary, width: 4)
            }
            .clipShape(RoundedRectangle(cornerRadius: 4))
        }
        .alert(isPresented: $isShowingError, error: error) { _ in
            Button("OK") {
                isShowingError = false
            }
        } message: { error in
            Text(error.errorMessage)
        }
    }
}

struct StoreSheet: View {
    @Environment(\.dismiss) var dismiss
    @Environment(\.purchase) private var purchase: PurchaseAction

    @State private var showRedeem = false
    @State private var monthlyProduct: Product? = nil
    var monthlyProductEntitlement: StoreKit.Transaction?
    @State private var annualProduct: Product? = nil
    var annualProductEntitlement: StoreKit.Transaction?
    @State private var lifetimeProduct: Product? = nil
    var lifetimeProductEntitlement: StoreKit.Transaction?

    @State private var renewalInfo: StoreKit.Product.SubscriptionInfo.RenewalInfo? = nil

    private func subscriptionStatusTaskAction(
        state: EntitlementTaskState<[Product.SubscriptionInfo.Status]>
    ) async {
        renewalInfo = try? state.value?.first?.renewalInfo.payloadValue
    }

    private let lifetimeSinceFormatter: DateComponentsFormatter = {
        let formatter = DateComponentsFormatter()
        formatter.unitsStyle = .full
        formatter.allowedUnits = [.year, .month, .day]
        formatter.maximumUnitCount = 1
        return formatter
    }()

    var body: some View {
        ScrollView {
            #if os(macOS)
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
            #endif
            VStack {
                #if !os(macOS)
                Spacer()
                #endif

                Text("Activate \(appName) to start restoring form data.")
                    .font(.title)
                    .multilineTextAlignment(.center)

                VStack(spacing: 8) {
                    if let monthlyProduct, let annualProduct, let lifetimeProduct {
                        if lifetimeProductEntitlement == nil, let renewalInfo {
                            let subscriptionProductEntitlements = [
                                monthlyProductEntitlement, annualProductEntitlement,
                            ]
                            let subscriptionProducts = [monthlyProduct, annualProduct]
                            if let autoRenewPreference = renewalInfo.autoRenewPreference {
                                if autoRenewPreference == renewalInfo.currentProductID {
                                    Text("Your subscription will renew automatically.")
                                        .frame(maxWidth: .infinity)
                                        .multilineTextAlignment(.center)
                                        .font(.callout)
                                } else if let currentProduct = subscriptionProducts.first(
                                    where: {
                                        $0.id == renewalInfo.currentProductID
                                    }),
                                    let nextProduct = subscriptionProducts.first(where: {
                                        $0.id == autoRenewPreference
                                    }),
                                    let renewalDate = renewalInfo.renewalDate
                                {
                                    Text(
                                        "Your subscription will switch from \(currentProduct.displayName) to \(nextProduct.displayName) on \(renewalDate.formatted(date: .abbreviated, time: .omitted))."
                                    )
                                    .frame(maxWidth: .infinity)
                                    .multilineTextAlignment(.center)
                                    .font(.callout)
                                }
                            } else if let currentProductEntitlementExpirationDate =
                                subscriptionProductEntitlements.first(where: {
                                    $0?.productID == renewalInfo.currentProductID
                                })??
                                .expirationDate
                            {
                                Text(
                                    "Your subscription isn't active, you'll lose access on \(currentProductEntitlementExpirationDate.formatted(date: .abbreviated, time: .omitted))!"
                                )
                                .frame(maxWidth: .infinity)
                                .foregroundStyle(.red)
                                .multilineTextAlignment(.center)
                                .font(.callout)
                            }
                        }
                        HStack(spacing: 8) {
                            ProductView(
                                product: monthlyProduct,
                                currentEntitlement: monthlyProductEntitlement,
                                disablePromo: lifetimeProductEntitlement != nil
                            )
                            ProductView(
                                product: annualProduct,
                                currentEntitlement: annualProductEntitlement,
                                disablePromo: lifetimeProductEntitlement != nil
                            )
                        }
                        .subscriptionStatusTask(
                            for: subscriptionID,
                            action: subscriptionStatusTaskAction
                        )
                        .iflet(lifetimeProductEntitlement) { view, entitlement in
                            view
                                .opacity(0.6)
                                .clipShape(RoundedRectangle(cornerRadius: 4))
                                .overlay {
                                    VStack {
                                        let duration = entitlement.originalPurchaseDate
                                            .timeIntervalSinceNow
                                        if duration > TimeInterval(60 * 60 * 24),
                                            let str = lifetimeSinceFormatter.string(from: duration)
                                        {
                                            Text("Lifetime for \(str)")
                                        } else {
                                            Text("Lifetime purchased")
                                        }
                                    }
                                    .padding()
                                    .background(.regularMaterial)
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                                    .shadow(radius: 20)
                                }
                        }
                        ProductView(
                            product: lifetimeProduct,
                            currentEntitlement: lifetimeProductEntitlement,
                            disablePromo: false
                        )
                    } else {
                        ProgressView()
                    }

                    Spacer()

                    Button {
                        Task {
                            try? await AppStore.sync()
                        }
                    } label: {
                        Text("Restore Missing Purchases")
                    }
                    .foregroundStyle(Color.accentColor)
                    .buttonStyle(.plain)

                    if #available(macOS 15.0, *) {
                        Button {
                            showRedeem = true
                        } label: {
                            Text("Redeem Code")
                        }
                        .foregroundStyle(Color.accentColor)
                        .buttonStyle(.plain)
                        .offerCodeRedemption(isPresented: $showRedeem) { result in
                            // Handle result
                        }
                    }
                }
                .padding()
            }
            .padding()
        }
        #if os(macOS)
        .frame(minWidth: 400, minHeight: 500)
        #endif
        .storeProductTask(for: monthlyProductID, action: monthlyProductAction)
        .storeProductTask(for: annualProductID, action: annualProductAction)
        .storeProductTask(for: lifetimeProductID, action: lifetimeProductAction)
    }

    private func monthlyProductAction(task: Product.TaskState) async {
        monthlyProduct = task.product
    }

    private func annualProductAction(task: Product.TaskState) async {
        annualProduct = task.product
    }

    private func lifetimeProductAction(task: Product.TaskState) async {
        lifetimeProduct = task.product
    }
}

#Preview("Sheet") {
    StoreSheet()
}

struct StoreView: View {
    @Binding var showStore: Bool?

    private var paidActive: Bool? {
        monthlyProductEntitlement != nil || annualProductEntitlement != nil
            || lifetimeProductEntitlement != nil
    }

    @State private var monthlyProductEntitlement: StoreKit.Transaction? = nil
    @State private var annualProductEntitlement: StoreKit.Transaction? = nil
    @State private var lifetimeProductEntitlement: StoreKit.Transaction? = nil

    @State private var monthlyProductEntitlementState:
        EntitlementTaskState<VerificationResult<StoreKit.Transaction>?> = .loading
    @State private var annualProductEntitlementState:
        EntitlementTaskState<VerificationResult<StoreKit.Transaction>?> = .loading
    @State private var lifetimeProductEntitlementState:
        EntitlementTaskState<VerificationResult<StoreKit.Transaction>?> = .loading

    var body: some View {
        VStack(spacing: 8) {
            if let paidActive {
                Text("\(appName) is \(paidActive ? "" : "not ")active")
                    .if(paidActive == false) {
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
        .sheet(
            isPresented: .init(
                get: {
                    showStore ?? false
                },
                set: { newValue in
                    showStore = newValue
                }
            )
        ) {
            if #available(macOS 15.0, iOS 18.0, *) {
                StoreSheet(
                    monthlyProductEntitlement: monthlyProductEntitlement,
                    annualProductEntitlement: annualProductEntitlement,
                    lifetimeProductEntitlement: lifetimeProductEntitlement
                )
                .presentationSizing(.fitted)
            } else {
                StoreSheet(
                    monthlyProductEntitlement: monthlyProductEntitlement,
                    annualProductEntitlement: annualProductEntitlement,
                    lifetimeProductEntitlement: lifetimeProductEntitlement
                )
            }
        }
        .currentEntitlementTask(for: monthlyProductID, action: monthlyProductEntitlementAction)
        .currentEntitlementTask(for: annualProductID, action: annualProductEntitlementAction)
        .currentEntitlementTask(for: lifetimeProductID, action: lifetimeProductEntitlementAction)
    }

    private func checkStorePopup() async {
        guard
            case .success = annualProductEntitlementState,
            case .success = monthlyProductEntitlementState,
            case .success = lifetimeProductEntitlementState
        else {
            return
        }

        let paidActive =
            annualProductEntitlement != nil || monthlyProductEntitlement != nil
            || lifetimeProductEntitlement != nil
        if showStore == nil && !paidActive {
            showStore = true
        }
    }

    private func monthlyProductEntitlementAction(
        state: EntitlementTaskState<VerificationResult<StoreKit.Transaction>?>
    ) async {
        monthlyProductEntitlementState = state
        monthlyProductEntitlement = try? state.value??.payloadValue
        await checkStorePopup()
    }

    private func annualProductEntitlementAction(
        state: EntitlementTaskState<VerificationResult<StoreKit.Transaction>?>
    ) async {
        annualProductEntitlementState = state
        annualProductEntitlement = try? state.value??.payloadValue
        await checkStorePopup()
    }

    private func lifetimeProductEntitlementAction(
        state: EntitlementTaskState<VerificationResult<StoreKit.Transaction>?>
    ) async {
        lifetimeProductEntitlementState = state
        lifetimeProductEntitlement = try? state.value??.payloadValue
        await checkStorePopup()
    }
}

#Preview("View") {
    StoreView(showStore: .constant(false))
}
