browser.runtime.onMessage.addListener(
  async (message: Message, sender, sendResponse) => {
    console.debug("Received message:", message);
    switch (message.action) {
      case "copyToClipboard": {
        sendResponse(await browser.runtime.sendNativeMessage("", message));
        break;
      }
    }
  }
);
