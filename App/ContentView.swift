import SafariServices
import SwiftUI

struct TextModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .frame(maxWidth: .infinity, alignment: .leading)
            .fixedSize(horizontal: false, vertical: true)
    }
}

extension Text {
    func customText() -> some View {
        modifier(TextModifier())
    }
}

struct NumberedView<Content>: View where Content: View {
    var index: Int

    @ViewBuilder var content: () -> Content

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Image(systemName: "\(index).square")
            content()
        }
    }
}

struct ContentView: View {
    #if os(macOS)
        @State var extensionState: SFSafariExtensionState? = nil
    #endif

    @ScaledMetric var scale = 1.0

    var body: some View {
        #if os(macOS)
            innerBody
        #else
            ScrollView {
                innerBody
            }
        #endif
    }

    var innerBody: some View {
        VStack(spacing: 40) {
            Image("Logo")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 120, height: 120)

            VStack(spacing: 8) {
                Text(
                    "FormKeeper perserves content you've entered into forms in case of accidental refresh or page close."
                )
                .customText()
                #if os(macOS)
                    if let extensionState {
                        if extensionState.isEnabled {
                            Text(
                                "FormKeeper’s extension is currently on. You can turn it off in Safari Extensions preferences."
                            )
                            .customText()
                        } else {
                            Text(
                                "FormKeeper’s extension is currently off. You can turn it on in Safari Extensions preferences."
                            )
                            .customText()
                        }
                    } else {
                        Text(
                            "You can turn on FormKeeper’s extension in Safari Extensions preferences."
                        )
                        .customText()
                    }
                #endif
            }
            .lineLimit(nil)
            .font(.body)
            .frame(maxWidth: 400)
            #if os(macOS)
                .fixedSize()
            #endif

            #if os(macOS)
                Button {
                    SFSafariApplication.showPreferencesForExtension(
                        withIdentifier: extensionBundleIdentifier
                    ) { (error) in
                        NSLog("Error \(String(describing: error))")
                    }
                } label: {
                    Text("Open Safari Extensions Preferences")
                }
            #else
                VStack(spacing: 20) {
                    Text(
                        "You can turn on FormKeeper’s extension in Safari Extensions preferences."
                    )
                    .customText()
                    Text("We recommend enabling everywhere:")
                        .customText()
                    VStack(spacing: 8) {
                        NumberedView(index: 1) {
                            Text(
                                "Go to **Settings** > **Apps** > **Safari** > **Extensions** > **\(Bundle.main.infoDictionary!["CFBundleName"] as! String)**"
                            ).customText()
                        }
                        NumberedView(index: 2) {
                            Text("Turn on **Allow Extension**")
                                .customText()
                        }
                        NumberedView(index: 3) {
                            Text("Under **Permissions**, tap **All Websites**")
                                .customText()
                        }
                        NumberedView(index: 4) {
                            Text("Select **Ask**")
                                .customText()
                        }
                    }
                }
                .font(.body)
            #endif
        }
        .padding()
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
