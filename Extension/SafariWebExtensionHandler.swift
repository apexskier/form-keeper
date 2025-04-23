//
//  SafariWebExtensionHandler.swift
//  Shared (Extension)
//
//  Created by Cameron Little on 2024-12-02.
//

import SafariServices
import os.log

class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    private enum DataType: String, RawRepresentable {
        case text = "text"
        case html = "html"

        #if os(macOS)
        var pasteboardType: NSPasteboard.PasteboardType {
            switch self {
            case .text:
                return .string
            case .html:
                return .html
            }
        }
        #endif
    }

    func beginRequest(with context: NSExtensionContext) {
        let request = context.inputItems.first as? NSExtensionItem

        Task {
            guard let message = request?.userInfo?[SFExtensionMessageKey] as? [String: Any],
                let action = message["action"] as? String
            else {
                return
            }
            switch action {
            case "copyToClipboard":
                guard let data = message["data"] as? String, let rawType = message["type"] as? String, let type = DataType(rawValue: rawType) else {
                    return
                }
                #if os(macOS)
                NSPasteboard.general.clearContents()
                NSPasteboard.general.setString(data, forType: type.pasteboardType)
                #else
                let pasteboard = UIPasteboard.general
                pasteboard.string = data
                #endif
            default:
                break
            }
        }
    }
}

extension NSExtensionContext {
    func completeRequest(returningItems items: [Any]?) async -> Bool {
        await withCheckedContinuation { continuation in
            completeRequest(returningItems: items) { expired in
                continuation.resume(with: .success(expired))
            }
        }
    }

    func completeRequest(returningMessage: Any) async -> Bool {
        let response = NSExtensionItem()
        response.userInfo = [
            SFExtensionMessageKey: returningMessage
        ]

        return await completeRequest(returningItems: [response])
    }
}
