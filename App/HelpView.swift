import SwiftUI
import MarkdownUI

struct HelpView: View {
    private var text: String? {
        guard let filepath = Bundle.main.url(forResource: "Help", withExtension: "md"),
              let contents = try? String(contentsOf: filepath) else {
            return nil
        }

        return contents
    }

    var body: some View {
        ScrollView {
            Group {
                if let text {
                    Markdown(text)
                } else {
                    Text("Failed to load Help content")
                }
            }
            .padding()
        }
    }
}

#Preview {
    ContentView(showStore: .constant(false))
}
