import SwiftUI

struct MoreItem: Identifiable {
    var title: String
    var systemImage: String

    enum Destination {
        case markdown(String)
        case link(URL)
    }

    var destination: Destination

    var id: String {
        title
    }
}

private let moreItems = [
    MoreItem(
        title: "Help",
        systemImage: "questionmark.circle",
        destination: .markdown("Help")
    ),
    MoreItem(
        title: "Privacy Policy",
        systemImage: "lock",
        destination: .markdown("PrivacyPolicy")
    ),
    MoreItem(
        title: "Terms of Service",
        systemImage: "doc.text",
        destination: .link(URL(string: "http://www.apple.com/legal/itunes/appstore/dev/stdeula")!)
    ),
]

struct URLView<Label>: View where Label: View {
    var url: URL
    @ViewBuilder var label: () -> Label

    @State private var open = false

    var body: some View {
#if canImport(UIKit)
        Button(
            action: {
                open = true
            },
            label: label
        )
        .sheet(isPresented: $open) {
            SafariView(url: url)
        }
#else
        Button(
            action: {
                NSWorkspace.shared.open(url)
            },
            label: label
        )
#endif
    }
}

struct MoreView: View {
    var body: some View {
        NavigationStack {
            List {
                ForEach(moreItems) { item in
                    let label = Label(item.title, systemImage: item.systemImage)
                    switch item.destination {
                    case .markdown(let file):
                        NavigationLink {
                            ScrollView {
                                Group {
                                    MarkdownFileView(fileName: file)
                                }
                                .padding()
                            }
                            .navigationTitle(item.title)
                        } label: {
                            label
                        }
                    case .link(let url):
                        URLView(url: url) {
                            label
                        }
                    }
                }
            }
            .buttonStyle(.plain)
            .navigationTitle(Text("More"))
        }
#if os(iOS)
        .navigationBarTitleDisplayMode(.large)
#endif
    }
}
