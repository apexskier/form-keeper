browser.tabs.query({ active: true }).then(function (currentTabs) {
  const button = document.getElementById("clear") as HTMLButtonElement | null;
  if (!button) {
    return;
  }

  button.disabled = false;

  button.addEventListener("click", () => {
    if (currentTabs[0]?.id) {
      const message: Message = { action: "clear" };
      browser.tabs.sendMessage(currentTabs[0].id, message);
    }
  });
});

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
