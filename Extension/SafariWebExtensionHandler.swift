//
//  SafariWebExtensionHandler.swift
//  Shared (Extension)
//
//  Created by Cameron Little on 2024-12-02.
//

import SafariServices
import StoreKit
import os.log

class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        let request = context.inputItems.first as? NSExtensionItem

        Task {
            let messageKey: String
            if #available(iOS 15.0, macOS 11.0, *) {
                messageKey = SFExtensionMessageKey
            } else {
                messageKey = "message"
            }

            guard let message = request?.userInfo?[messageKey] as? [String: Any],
                let action = message["action"] as? String
            else {
                return
            }
            switch action {
            case "checkActiveSubscription":
                if !(await context.completeRequest(returningMessage: [
                    "action": "subscriptionActive",
                    "subscriptionActive": await isSubscriptionActive()
                ])) {
                    print("failed")
                }
            case "activate":
                print("")
                if await isSubscriptionActive() {
                    if !(await context.completeRequest(returningMessage: [
                        "action": "subscriptionActive",
                        "subscriptionActive": true
                    ])) {
                        print("failed")
                    }
                } else {
                    print("opening link")
                    guard let url = URL(string: "form-keeper://activate") else {
                        return
                    }
                    #if os(macOS)
                    let opened = NSWorkspace.shared.open(url)
                    #else
                    let opened = await context.open(url)
                    #endif
                    if opened {
                        Task {
                            // wait for one transaction to change, then attempt to signal back to the extension to indicate purchase
                            let _ = await Transaction.updates.first(where: { _ in true })
                            if !(await context.completeRequest(returningMessage: [
                                "action": "subscriptionActive",
                                "subscriptionActive": await isSubscriptionActive()
                            ])) {
                                print("failed")
                            }
                        }
                    } else {
                        if !(await context.completeRequest(returningMessage: [
                            "action": "openApp"
                        ])) {
                            print("failed")
                        }
                    }
                }
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
        let messageKey: String
        if #available(iOS 15.0, macOS 11.0, *) {
            messageKey = SFExtensionMessageKey
        } else {
            messageKey = "message"
        }

        let response = NSExtensionItem()
        response.userInfo = [
            messageKey: returningMessage
        ]

        return await completeRequest(returningItems: [response])
    }
}
