browser.runtime.onMessage.addListener(
  async (message: Message, sender, sendResponse) => {
    console.log("Received message:", message);
    switch (message.action) {
      case "activate":
      case "checkActiveSubscription":
      case "copyToClipboard": {
        sendResponse(await browser.runtime.sendNativeMessage("", message));
        break;
      }
    }
  }
);
