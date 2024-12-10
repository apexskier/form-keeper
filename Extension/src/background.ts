browser.runtime.onMessage.addListener(
  async (message: Message, sender, sendResponse) => {
    console.log("Received message:", message);
    switch (message.action) {
      case "checkActiveSubscription": {
        sendResponse(await browser.runtime.sendNativeMessage("", message));
        break;
      }
      case "activate": {
        sendResponse(await browser.runtime.sendNativeMessage("", message));
        break;
      }
    }
  }
);
