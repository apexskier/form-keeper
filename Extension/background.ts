const port = browser.runtime.connectNative("");
port.onMessage.addListener((_response) => {
  const response = _response as unknown as { name: string; userinfo: unknown };
  console.log("Received message from native application: ", response);
  debugger;
  if (response.name == "subscriptionActive") {
    browser.runtime.sendMessage({
      action: "subscriptionActive",
      ...(response.userinfo as {}),
    });
  }
});

browser.runtime.onMessageExternal.addListener(function (
  message,
  sender,
  sendResponse
) {
  console.log("Received message external:", message);
  sendResponse({ farewell: "Goodbye from the background page!" });
});

browser.runtime.onMessage.addListener(
  async (message: Message, sender, sendResponse) => {
    console.log("Received message:", message);
    switch (message.action) {
      case "checkActiveSubscription": {
        let response = await browser.runtime.sendNativeMessage("", message);
        sendResponse(response);
        break;
      }
      case "activate": {
        browser.runtime.sendNativeMessage("", message);
        break;
      }
    }
  }
);
