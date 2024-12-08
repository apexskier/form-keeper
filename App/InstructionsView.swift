import SwiftUI

struct NumberedView<Content>: View where Content: View {
    var index: Int

    @ViewBuilder var content: () -> Content

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Image(systemName: "\(index).square")
                .accessibilityLabel(Text("Step \(index)"))
            content()
        }
    }
}

#if os(iOS)
struct FakeContentModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .frame(maxWidth: .infinity)
            .padding()
            .background(.background)
            .clipShape(
                RoundedRectangle(
                    cornerRadius: 16, style: .circular)
            )
            .shadow(color: .primary.opacity(0.2), radius: 16)
    }
}

extension View {
    func fakeContent() -> some View {
        modifier(FakeContentModifier())
    }
}

struct InstructionsViewiOSGlobal: View {
    var body: some View {
        VStack(spacing: 8) {
            NumberedView(index: 1) {
                Text(
                    "Go to **Settings** > **Apps** > **Safari** > **Extensions** > **\(appName)**"
                ).customText()
            }
            NumberedView(index: 2) {
                Text("Turn on **Allow Extension**")
                    .customText()
            }
            NumberedView(index: 3) {
                Text("Under **Permissions**, tap **All Websites**")
                    .customText()
            }
            NumberedView(index: 4) {
                Text("Select **Allow**")
                    .customText()
            }
        }
    }
}

#Preview {
    InstructionsViewiOSGlobal()
}

struct InstructionsViewiOSSafari: View {
    @State private var tapOpacity = 0.0
    @State private var indicatorAnimationValue = 0.0

    @ScaledMetric private var scale = 1.0

    var body: some View {
        VStack(spacing: 20) {
            VStack(spacing: 8) {
                NumberedView(index: 1) {
                    Text(
                        "Tap the **\(Image(systemName: "puzzlepiece.extension.fill"))** button in the Safari address bar."
                    )
                    .customText()
                }
                HStack {
                    HStack {
                        Image(systemName: "textformat.size")
                        Image(
                            systemName: "puzzlepiece.extension.fill"
                        )
                        .foregroundColor(.gray)
                    }
                    Spacer()
                    HStack {
                        Image(systemName: "lock.fill")
                            .foregroundColor(.gray)
                        RoundedRectangle(cornerRadius: 2)
                            .fill(.gray.opacity(0.5))
                            .frame(
                                width: 120, height: 12
                            )
                    }
                    Spacer()
                    Image(systemName: "arrow.clockwise")
                }
                .fakeContent()
            }

            VStack(spacing: 8) {
                NumberedView(index: 2) {
                    Text(
                        "Tap \"**Manage Extensions**\"."
                    )
                    .customText()
                }
                HStack {
                    Text("Manage Extensions")
                    Spacer()
                    Image(
                        systemName: "puzzlepiece.extension"
                    )
                }
                .fakeContent()
            }

            VStack(spacing: 8) {
                NumberedView(index: 3) {
                    Text(
                        "Enable the **\(appName)** extension."
                    )
                    .customText()
                }
                HStack {
                    HStack {
                        Image("Logo").resizable().frame(width: 32, height: 32)
                            .frame(height: 0)
                        Text(appName)
                    }
                    Spacer()
                    Toggle(isOn: .constant(true)) {}
                        .frame(height: 0)
                }
                .fakeContent()
            }
        }
    }
}

#Preview {
    InstructionsViewiOSSafari()
}
#endif
