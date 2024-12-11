import SwiftUI
import MarkdownUI

struct MarkdownFileView: View {
    var fileName: String

    private var text: String? {
        guard let filepath = Bundle.main.url(forResource: fileName, withExtension: "md"),
              let contents = try? String(contentsOf: filepath) else {
            return nil
        }

        return contents
    }

    var body: some View {
        if let text {
            Markdown(text)
        } else {
            Text("Failed to load content")
        }
    }
}

struct HelpView: View {
    var body: some View {
        ScrollView {
            Group {
                MarkdownFileView(fileName: "Help")
            }
            .padding()
        }
    }
}

struct PrivacyPolicyView: View {
    var body: some View {
        ScrollView {
            Group {
                MarkdownFileView(fileName: "PrivacyPolicy")
            }
            .padding()
        }
    }
}

#Preview {
    HelpView()
}
