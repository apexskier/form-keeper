import SwiftUI
import MarkdownUI

struct MarkdownFileView: View {
    var fileName: String

    private var text: String? {
        guard let filepath = Bundle.main.url(forResource: fileName, withExtension: "md"),
              let contents = try? String(contentsOf: filepath, encoding: .utf8) else {
            return nil
        }

        return contents
    }

    var body: some View {
        if let text {
            Markdown(text)
                .markdownImageProvider(.asset)
                .markdownInlineImageProvider(.asset)
        } else {
            Text("Failed to load content")
        }
    }
}

#Preview {
    MarkdownFileView(fileName: "Help")
}
