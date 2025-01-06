import SwiftUI

let extensionBundleIdentifier = "com.camlittle.form-keeper.web-extension"

let appName = Bundle.main.infoDictionary?["CFBundleName"] as? String ?? "FormKeeper"

@main
struct MyMain {
    static func main() {
        ModernApp.main()
    }
}

struct SharedView: View {
    @State private var showStore: Bool? = false

    var body: some View {
        ContentView(showStore: $showStore)
            .onOpenURL { url in
                if (url.absoluteString == "form-keeper://activate") {
                    showStore = true
                }
            }
    }
}

#if os(macOS)
struct ModernApp: App {
    var body: some Scene {
        Window(appName, id: "main") {
            SharedView()
        }
        .windowResizability(.contentSize)
        .defaultPosition(.center)
    }
}
#else
struct ModernApp: App {
    var body: some Scene {
        WindowGroup {
            SharedView()
                .background()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
}
#endif
