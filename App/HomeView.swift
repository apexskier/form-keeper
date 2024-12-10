import SwiftUI
import SafariServices

#if os(macOS)
struct ExtensionStateManagementModifier: ViewModifier {
    @Environment(\.appearsActive) private var appearsActive: Bool
    @Binding var extensionState: SFSafariExtensionState?

    private func updateState() {
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

    func body(content: Content) -> some View {
        if #available(macOS 14.0, *) {
            content.onChange(of: appearsActive, initial: true) { old, new in
                if new {
                    updateState()
                }
            }
        } else {
            content.onAppear {
                updateState()
            }
        }
    }
}
#endif

struct HomeView: View {
#if os(macOS)
    @State private var extensionState: SFSafariExtensionState? = nil
#endif

    enum Instruction {
        case global
        case safari
    }
    @State private var instructionShown: Instruction = .safari

    @Binding var showStore: Bool

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

                StoreView(showStore: $showStore)

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
                            if let error = error {
                                print(
                                    "Error showing Safari extension preferences: \(String(describing: error))"
                                )
                            }
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
            }
            .padding()
            .frame(maxWidth: 400)
            .lineLimit(nil)
        }
#if os(macOS)
        .modifier(ExtensionStateManagementModifier(extensionState: $extensionState))
#endif
    }
}

#Preview {
    HomeView(showStore: .constant(false))
}
