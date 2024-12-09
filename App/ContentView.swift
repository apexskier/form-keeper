import SafariServices
import StoreKit
import SwiftUI

struct TextModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

extension Text {
    func customText() -> some View {
        modifier(TextModifier())
    }
}

extension View {
    func bold_() -> some View {
        if #available(macOS 13.0, iOS 16.0, *) {
            return self.bold()
        }
        return self
    }

    func `if`(condition: Bool, transform: (Self) -> Self) -> some View {
        if condition {
            return transform(self)
        }
        return self
    }
}

struct ContentView: View {
    #if os(macOS)
    @State private var extensionState: SFSafariExtensionState? = nil
    #endif

    enum Instruction {
        case global
        case safari
    }
    @State private var instructionShown: Instruction = .safari

    @State private var showStore = false

    @State private var subscriptionActive: Bool? = nil

    var turnOnText: some View {
        Text(
            "You can turn on \(appName)’s extension in Safari Extensions preferences."
        )
        .customText()
    }


    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                Image("Logo")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 120, height: 120)

                Text(
                    "\(appName) tries to perserves content you enter into forms in case of accidental refresh or page close."
                )
                .customText()

                #if os(macOS)
                VStack(spacing: 8) {
                    if let extensionState {
                        if extensionState.isEnabled {
                            Text(
                                "\(appName)’s extension is currently on. You can turn it off in Safari Extensions preferences."
                            )
                            .customText()
                        } else {
                            Text(
                                "\(appName)’s extension is currently off. You can turn it on in Safari Extensions preferences."
                            )
                            .customText()
                        }
                    } else {
                        turnOnText
                    }
                    Button {
                        SFSafariApplication.showPreferencesForExtension(
                            withIdentifier: extensionBundleIdentifier
                        ) { (error) in
                            print("Error \(String(describing: error))")
                        }
                    } label: {
                        Text("Open Safari Extensions Preferences")
                    }
                }
                #else
                turnOnText

                VStack(alignment: .leading, spacing: 20) {
                    HStack(spacing: 8) {
                        VStack {
                            Button {
                                instructionShown = .safari
                            } label: {
                                Text("Safari")
                                    .if(
                                        condition: instructionShown
                                            == .safari
                                    ) {
                                        $0.bold()
                                    }
                            }
                        }
                        VStack {
                            Button {
                                instructionShown = .global
                            } label: {
                                Text("Settings")
                                    .if(
                                        condition: instructionShown
                                            == .global
                                    ) {
                                        $0.bold()
                                    }
                            }
                        }
                    }
                    .buttonStyle(.bordered)

                    switch instructionShown {
                    case .global:
                        InstructionsViewiOSGlobal()
                    case .safari:
                        InstructionsViewiOSSafari()
                    }
                }
                #endif

                VStack(spacing: 8) {
                    if let subscriptionActive {
                        if subscriptionActive {
                            Text("Subscription is active")
                        } else {
                            Text("Subscription is not active")
                        }
                    } else {
                        ProgressView()
                    }
                    Button {
                        showStore = true
                    } label: {
                        Label("Open Store", systemImage: "cart")
                    }
                }
            }
            .padding()
            .frame(maxWidth: 400)
            .lineLimit(nil)
        }
        .sheet(isPresented: $showStore) {
            if #available(macOS 15.0, iOS 18.0, *) {
                StoreView()
                    .presentationSizing(.fitted)
            } else {
                StoreView()
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

            let activateSubscriptionGroup = "CD8720D7"

            for product in products {
                let entitlement = await product.currentEntitlement
                switch entitlement {
                case .verified(let transaction):
                    if transaction.subscriptionGroupID == activateSubscriptionGroup {
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
        #if os(macOS)
        .onAppear {
            SFSafariExtensionManager.getStateOfSafariExtension(
                withIdentifier: extensionBundleIdentifier
            ) { (state, error) in
                extensionState = state
                if let error = error {
                    print("Error getting extension state: \(error)")
                    return
                }
            }
        }
        #endif
    }
}

#Preview {
    ContentView()
}
