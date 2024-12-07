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

struct ContentView: View {
    @State var extensionState: SFSafariExtensionState? = nil

    var body: some View {
        VStack(spacing: 20) {
            Image("Logo")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 120, height: 120)
            VStack(spacing: 8) {
                Text(
                    "FormKeeper perserves content you've entered into forms in case of accidental refresh or page close."
                )
                .customText()
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
            }
            .lineLimit(nil)
            .font(.body)
            .frame(maxWidth: 400)
            .fixedSize()

            Button {
                SFSafariApplication.showPreferencesForExtension(
                    withIdentifier: extensionBundleIdentifier
                ) { (error) in
                    NSLog("Error \(String(describing: error))")
                }
            } label: {
                Text("Open Safari Extensions Preferences")
            }
        }
        .padding()
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
    }
}

#Preview {
    ContentView()
}
