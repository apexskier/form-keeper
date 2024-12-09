import SwiftUI

let extensionBundleIdentifier = "com.camlittle.form-keeper.extension"

let appName = Bundle.main.infoDictionary?["CFBundleName"] as? String ?? "FormKeeper"

@main
struct MyMain {
    static func main() {
        if #available(macOS 13.0, iOS 17.0, *) {
            ModernApp.main()
        } else {
            OldApp.main()
        }
    }
}

struct SharedView: View {
    @State private var showStore = false

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
@available(macOS 13.0, *)
struct ModernApp: App {
    var body: some Scene {
        Window(appName, id: "main") {
            SharedView()
        }
        .windowResizability(.contentSize)
        .defaultPosition(.center)
    }
}

struct OldApp: App {
    var body: some Scene {
        WindowGroup(id: "main") {
            SharedView()
        }
    }
}
#else
@available(iOS 17.0, *)
struct ModernApp: App {
    var body: some Scene {
        WindowGroup {
            SharedView()
                .background()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
}

struct OldApp: App {
    var body: some Scene {
        WindowGroup {
            SharedView()
        }
    }
}
#endif
