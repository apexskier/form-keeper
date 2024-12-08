import type { Message } from "./types";

console.log("Hello World!", browser);

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
