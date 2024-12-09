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

function RestoredItems() {
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
      content = <p>failed to load</p>;
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
      <button onClick={reload}>Refresh</button>
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
        FormKeeper is <ActivatedText activated={activated} />{" "}
        <button
          onClick={checkActive}
          style={{
            appearance: "none",
            border: "none",
            background: "none",
          }}
        >
          <svg
            height={"1em"}
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
            viewBox="0 0 17.6074 23.3691"
          >
            <g>
              <rect height="23.3691" opacity="0" width="17.6074" x="0" y="0" />
              <path
                d="M0 12.4023C0 17.168 3.85742 21.0254 8.62305 21.0254C13.3887 21.0254 17.2461 17.168 17.2461 12.4023C17.2461 11.9238 16.9141 11.582 16.4355 11.582C15.9766 11.582 15.6738 11.9238 15.6738 12.3926C15.6738 16.2891 12.5195 19.4434 8.62305 19.4434C4.72656 19.4434 1.57227 16.2891 1.57227 12.3926C1.57227 8.49609 4.72656 5.3418 8.62305 5.3418C9.375 5.3418 10.0586 5.39062 10.6348 5.52734L7.72461 8.41797C7.55859 8.56445 7.5 8.76953 7.5 8.97461C7.5 9.42383 7.83203 9.75586 8.26172 9.75586C8.50586 9.75586 8.68164 9.66797 8.82812 9.53125L12.8516 5.48828C13.0273 5.32227 13.1055 5.12695 13.1055 4.90234C13.1055 4.6875 13.0176 4.47266 12.8516 4.31641L8.83789 0.234375C8.69141 0.078125 8.50586 0 8.26172 0C7.83203 0 7.5 0.351562 7.5 0.800781C7.5 1.00586 7.56836 1.20117 7.71484 1.35742L10.3027 3.94531C9.80469 3.84766 9.21875 3.7793 8.62305 3.7793C3.85742 3.7793 0 7.63672 0 12.4023Z"
                fill="black"
                fill-opacity="0.85"
              />
            </g>
          </svg>
        </button>
      </p>
      {activated === false && (
        <p>
          <button onClick={handleActivateClick}>Activate</button>
        </p>
      )}
      <p>
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
      <RestoredItems />
    </>
  );
}
