//
//  SafariWebExtensionHandler.swift
//  Shared (Extension)
//
//  Created by Cameron Little on 2024-12-02.
//

import SafariServices
import StoreKit
import os.log

let subscriptionGroupID = "CD8720D7"

func isSubscriptionActive() async -> Bool {
    guard
        let products = try? await Product.products(for: [
            "activate.annual", "activate.monthly",
        ])
    else {
        return false
    }

    for product in products {
        let entitlement = await product.currentEntitlement
        switch entitlement {
        case .verified(let transaction):
            if transaction.subscriptionGroupID == subscriptionGroupID {
                return true
            }
        case .unverified(_, let error):
            print("Subscription is not active: \(error.localizedDescription)")
        case .none:
            break
        }
    }

    return false
}

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
                let subscriptionActive = await isSubscriptionActive()

                let response = NSExtensionItem()
                response.userInfo = [
                    messageKey: ["subscriptionActive": subscriptionActive]
                ]
                context.completeRequest(returningItems: [response]) { expired in
                    print("expired: \(expired)")
                }
            case "activate":
                NSWorkspace.shared.open(URL(string: "form-keeper://activate")!)
            default:
                break
            }
        }
    }
}
