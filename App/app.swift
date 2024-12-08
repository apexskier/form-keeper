import SwiftUI

let extensionBundleIdentifier = "com.camlittle.form-keeper.Extension"

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

#if os(macOS)
    @available(macOS 13.0, *)
    struct ModernApp: App {
        var body: some Scene {
            Window(appName, id: "main") {
                ContentView()
            }
            .windowResizability(.contentSize)
            .defaultPosition(.center)
        }
    }

    struct OldApp: App {
        var body: some Scene {
            WindowGroup(id: "main") {
                ContentView()
            }
        }
    }
#else
    @available(iOS 17.0, *)
    struct ModernApp: App {
        var body: some Scene {
            WindowGroup {
                ContentView()
                    .background()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
    }

    struct OldApp: App {
        var body: some Scene {
            WindowGroup {
                ContentView()
            }
        }
    }
#endif
