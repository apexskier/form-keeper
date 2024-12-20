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
    func `if`<V: View>(_ condition: Bool, transform: (Self) -> V) -> AnyView {
        if condition {
            return AnyView(transform(self))
        }
        return AnyView(self)
    }

    func `iflet`<T, V: View>(_ value: T?, transform: (Self, T) -> V) -> AnyView {
        if let value {
            return AnyView(transform(self, value))
        }
        return AnyView(self)
    }
}

struct ContentView: View {
    @Binding var showStore: Bool

    var body: some View {
        if #available(macOS 15.0, iOS 18.0, *) {
            TabView {
                Tab("Home", systemImage: "house") {
                    HomeView(showStore: $showStore)
                }
                Tab("More", systemImage: "ellipsis.circle") {
                    MoreView()
                }
            }
        } else {
            TabView {
                HomeView(showStore: $showStore)
                    .tabItem {
                        Label("Home", systemImage: "house")
                    }
                MoreView()
                    .tabItem {
                        Label("More", systemImage: "ellipsis.circle")
                    }
            }
        }
    }
}

#Preview {
    ContentView(showStore: .constant(false))
}
