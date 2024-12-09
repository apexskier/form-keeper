import * as React from "react";
import { createRoot } from "react-dom/client";

// Render your React component instead
const root = createRoot(document.getElementById("root")!);

root.render(<Main />);

function ActivatedText({ activated }: { activated: null | boolean }) {
  if (activated === null) {
    return <i>loading...</i>;
  }
  return <>{activated ? "active!" : "inactive!"}</>;
}

async function getCurrentTab() {
  const currentTabs = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (currentTabs.length > 1) {
    console.warn("Expected only one active tab, got", currentTabs);
  }

  return currentTabs[0]?.id ?? null;
}

const loading = Symbol("loading");
type loading = typeof loading;
const failed = Symbol("failed");
type failed = typeof failed;

function useRerunEffect(): [unknown, () => void] {
  const [reload, setReload] = React.useState({});
  return [reload, () => setReload({})];
}

function PageDetails() {
  const [reloadDep, reload] = useRerunEffect();
  const [data, setData] = React.useState<
    | loading
    | failed
    | {
        restoredSoFar: Array<string>;
        savedForPage: Array<string>;
      }
  >(loading);
  React.useEffect(() => {
    (async () => {
      setData(loading);

      const tabId = await getCurrentTab();
      if (!tabId) {
        console.warn("couldn't get current tab");
        setData(failed);
        return;
      }

      const response = (await browser.tabs.sendMessage(tabId, {
        action: "getSaved",
      })) as
        | undefined
        | { restoredSoFar: Array<string>; savedForPage: Array<string> };
      if (!response) {
        setData(failed);
        return;
      }
      setData(response);
    })();
  }, [reloadDep]);

  let content: React.ReactNode;
  switch (data) {
    case loading:
      content = <p>loading...</p>;
      break;
    case failed:
      content = <p>Couldn't communicate with page, please restart Safari.</p>;
      break;
    default:
      content = (
        <>
          <h3>Restored fields</h3>
          {data.restoredSoFar.length ? (
            <ul>
              {data.restoredSoFar.map((item) => (
                <li key={item}>
                  <code>{item}</code>
                </li>
              ))}
            </ul>
          ) : (
            <p>Nothing yet.</p>
          )}
          <h3>Saved fields</h3>
          <details>
            <summary>
              {data.savedForPage.length} item
              {data.savedForPage.length === 1 ? "" : "s"}
            </summary>
            {data.savedForPage.length ? (
              <ul>
                {data.savedForPage.map((item) => (
                  <li key={item}>
                    <code>{item}</code>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nothing yet.</p>
            )}
          </details>
        </>
      );
      break;
  }

  return (
    <>
      <h2>Current tab</h2>
      {content}
      <p>
        <button onClick={reload}>Refresh</button>
        <button
          onClick={React.useCallback(async () => {
            const tabId = await getCurrentTab();
            if (!tabId) {
              console.warn("couldn't get current tab");
              return;
            }
            const message: Message = { action: "clear" };
            browser.tabs.sendMessage(tabId, message);
            window.close();
          }, [])}
        >
          Wipe Page
        </button>
      </p>
    </>
  );
}

function Main() {
  const checkActive = React.useCallback(() => {
    browser.runtime.onMessage.addListener((message: Message) => {
      if (message.action === "subscriptionActive") {
        setActivated(message.subscriptionActive);
      }
    });
  }, []);

  const [activated, setActivated] = React.useState<boolean | null>(null);
  React.useEffect(() => {
    checkActive();
  }, []);

  React.useEffect(() => {
    browser.runtime
      .sendMessage({ action: "checkActiveSubscription" })
      .then((response: { subscriptionActive: boolean }) => {
        if (!response) {
          return;
        }
        setActivated(response.subscriptionActive);
      });
  }, []);

  const handleActivateClick = React.useCallback(async () => {
    const response = (await browser.runtime.sendMessage({
      action: "activate",
    })) as
      | { action: "subscriptionActive"; subscriptionActive: boolean }
      | { action: "openApp" };
    if (response.action == "openApp") {
      // can't open directly from a popup, so ask the current tab to open it

      const tabId = await getCurrentTab();
      if (!tabId) {
        console.warn("couldn't get current tab");
        return;
      }

      const message: Message = { action: "openApp" };
      browser.tabs.sendMessage(tabId, message);
    } else {
      setActivated(response.subscriptionActive);
    }
    window.close();
  }, []);

  return (
    <>
      <p>
        FormKeeper is <ActivatedText activated={activated} />
      </p>
      {activated === false && (
        <p>
          <button onClick={handleActivateClick}>Activate</button>
        </p>
      )}
      <PageDetails />
    </>
  );
}
