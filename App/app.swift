import SwiftUI

let extensionBundleIdentifier = "com.camlittle.form-keeper.Extension"

@main
struct MyMain {
    static func main() {
        if #available(macOS 13.0, *) {
            ModernApp.main()
        } else {
            OldApp.main()
        }
    }
}

@available(macOS 13.0, *)
struct ModernApp: App {
    var body: some Scene {
        Window("FormKeeper", id: "main") {
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
