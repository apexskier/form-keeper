const button = document.getElementById("clear") as HTMLButtonElement | null;
if (button) {
  button.addEventListener("click", async () => {
    const currentTabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (currentTabs.length > 1) {
      console.warn("Expected only one active tab, got", currentTabs);
    }

    if (!currentTabs[0]?.id) {
      return;
    }

    const message: Message = { action: "clear" };
    await browser.tabs.sendMessage(currentTabs[0].id, message);
  });
}

addEventListener("DOMContentLoaded", () => {
  const activateButtonEl = document.getElementById("activate");
  activateButtonEl?.addEventListener("click", () => {
    browser.runtime.sendMessage({ action: "activate" });
  });

  const activatedEl = document.getElementById("activated");
  if (activatedEl) {
    browser.runtime.onMessage.addListener((message: Message) => {
      if (message.action === "subscriptionActive") {
        if (message.subscriptionActive) {
          activatedEl.textContent = "active!";
        } else {
          activatedEl.textContent = "inactive!";
        }
      }
    });

    browser.runtime
      .sendMessage({ action: "checkActiveSubscription" })
      .then((response: { echo: unknown; subscriptionActive: boolean }) => {
        if (!response) {
          return;
        }
        if (response.subscriptionActive) {
          activatedEl.textContent = "active!";
        } else {
          activatedEl.textContent = "inactive!";
        }
      });
  }
});
