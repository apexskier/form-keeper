import * as React from "react";
import { createRoot } from "react-dom/client";
import {
  Code,
  Group,
  IconButton,
  Spinner,
  StackSeparator,
  Table,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Provider } from "./components/ui/provider";
import { Button } from "./components/ui/button";
import {
  LuFocus,
  LuPencilLine,
  LuClipboardCopy,
  LuDelete,
  LuEye,
  LuEyeClosed,
  LuCircleOff,
} from "react-icons/lu";
import { ToggleTip } from "../../../src/components/ui/toggle-tip";

// Render your React component instead
const root = createRoot(document.getElementById("root")!);

root.render(
  <Provider>
    <Main />
  </Provider>
);

const loading = Symbol("loading");
type loading = typeof loading;
const failed = Symbol("failed");
type failed = typeof failed;

const activatedContext = React.createContext<loading | boolean>(loading);

function ActivatedText() {
  const activated = React.useContext(activatedContext);
  if (activated === loading) {
    return <Spinner />;
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

function useRerunEffect(): [unknown, () => void] {
  const [reload, setReload] = React.useState({});
  return [reload, () => setReload({})];
}

function FocusSelectorButton({
  selector,
  disabled,
}: {
  selector: string;
  disabled: boolean;
}) {
  return (
    <IconButton
      aria-label="Focus field"
      title="Focus field"
      onClick={React.useCallback(async () => {
        const tabId = await getCurrentTab();
        if (!tabId) {
          console.warn("couldn't get current tab");
          return;
        }
        window.close();
        const message: Message = { action: "focusElement", selector };
        browser.tabs.sendMessage(tabId, message);
      }, [])}
      size="xs"
      variant="outline"
      disabled={disabled}
    >
      <LuFocus />
    </IconButton>
  );
}

function RestoreSelectorButton({
  selector,
  disabled,
}: {
  selector: string;
  disabled: boolean;
}) {
  const activated = React.useContext(activatedContext);
  return (
    <IconButton
      aria-label="Restore field"
      title="Restore field"
      onClick={React.useCallback(async () => {
        const tabId = await getCurrentTab();
        if (!tabId) {
          console.warn("couldn't get current tab");
          return;
        }
        window.close();
        const message: Message = { action: "fillElement", selector };
        browser.tabs.sendMessage(tabId, message);
      }, [activated])}
      size="xs"
      variant="outline"
      disabled={disabled}
    >
      <LuPencilLine />
    </IconButton>
  );
}

function CopySelectorContentButton({
  selector,
  disabled,
}: {
  selector: string;
  disabled: boolean;
}) {
  const activated = React.useContext(activatedContext);
  return (
    <IconButton
      aria-label="Copy contents"
      title="Copy contents"
      onClick={React.useCallback(async () => {
        const tabId = await getCurrentTab();
        if (!tabId) {
          console.warn("couldn't get current tab");
          return;
        }
        const message: Message = { action: "copyElement", selector };
        browser.tabs.sendMessage(tabId, message);
      }, [activated])}
      size="xs"
      variant="outline"
      disabled={disabled}
    >
      <LuClipboardCopy />
    </IconButton>
  );
}

function ForgetSelectorContentButton({
  selector,
  onResponse,
  disabled,
}: {
  selector: string;
  onResponse: (data: MainPayload) => void;
  disabled: boolean;
}) {
  const activated = React.useContext(activatedContext);
  return (
    <IconButton
      aria-label="Forget"
      title="Forget"
      onClick={React.useCallback(async () => {
        const tabId = await getCurrentTab();
        if (!tabId) {
          console.warn("couldn't get current tab");
          return;
        }
        const message: Message = { action: "forgetElement", selector };
        onResponse(
          (await browser.tabs.sendMessage(tabId, message)) as MainPayload
        );
      }, [activated])}
      size="xs"
      variant="outline"
      disabled={disabled}
    >
      <LuDelete />
    </IconButton>
  );
}

function PageDetails() {
  const [reloadDep, reload] = useRerunEffect();
  const [data, setData] = React.useState<loading | failed | MainPayload>(
    loading
  );
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
      })) as undefined | MainPayload;
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
      content = <Spinner />;
      break;
    case failed:
      content = (
        <Text>Couldn't communicate with page, please restart Safari.</Text>
      );
      break;
    default:
      content = data.elements.length ? (
        <Table.Root size="sm">
          <Table.Body>
            {data.elements
              .sort((a, b) => {
                // first sort by visibility/presense, then by restored, then by has saved content, then by selector
                if (a.presense === "visible" && b.presense !== "visible") {
                  return -1;
                }
                if (a.presense !== "visible" && b.presense === "visible") {
                  return 1;
                }
                if (a.presense === "present" && b.presense === null) {
                  return -1;
                }
                if (a.presense === null && b.presense === "present") {
                  return 1;
                }
                if (a.restored && !b.restored) {
                  return -1;
                }
                if (!a.restored && b.restored) {
                  return 1;
                }
                if (a.savedContent && !b.savedContent) {
                  return -1;
                }
                if (!a.savedContent && b.savedContent) {
                  return 1;
                }
                return a.selector.localeCompare(b.selector);
              })
              .map(({ selector, presense, savedContent, restored }) => (
                <Table.Row key={selector}>
                  <Table.Cell>
                    {presense === "visible" ? (
                      <ToggleTip content="Visible on page">
                        <LuEye />
                      </ToggleTip>
                    ) : presense === "present" ? (
                      <ToggleTip content="Present but not visible">
                        <LuEyeClosed />
                      </ToggleTip>
                    ) : (
                      <ToggleTip content="Not present on page">
                        <LuCircleOff />
                      </ToggleTip>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <Code colorPalette={restored ? "green" : undefined}>
                      {selector}
                    </Code>
                  </Table.Cell>
                  <Table.Cell textAlign="end">
                    <Group>
                      <FocusSelectorButton
                        selector={selector}
                        disabled={presense !== "visible"}
                      />
                      <RestoreSelectorButton
                        selector={selector}
                        disabled={presense === null || !savedContent}
                      />
                      <CopySelectorContentButton
                        selector={selector}
                        disabled={!savedContent}
                      />
                      <ForgetSelectorContentButton
                        selector={selector}
                        onResponse={setData}
                        disabled={!savedContent}
                      />
                    </Group>
                  </Table.Cell>
                </Table.Row>
              ))}
          </Table.Body>
        </Table.Root>
      ) : (
        <Text>Nothing yet.</Text>
      );
      break;
  }

  return (
    <VStack align="start" width="100%">
      {content}
      <Group>
        <Button
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
          Wipe Saved
        </Button>
        <Button onClick={reload} loading={data === loading}>
          Refresh
        </Button>
      </Group>
    </VStack>
  );
}

function useActivated(): [boolean | loading, () => void] {
  const checkActive = React.useCallback(() => {
    browser.runtime.onMessage.addListener((message: Message) => {
      if (message.action === "subscriptionActive") {
        setActivated(message.subscriptionActive);
      }
    });
  }, []);

  const [activated, setActivated] = React.useState<boolean | loading>(loading);
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

  const onActivate = React.useCallback(async () => {
    const response = (await browser.runtime.sendMessage({
      action: "activate",
    })) as
      | { action: "subscriptionActive"; subscriptionActive: boolean }
      | { action: "openApp" };

    const tabId = await getCurrentTab();
    if (!tabId) {
      console.warn("couldn't get current tab");
      return;
    }

    if (response.action == "openApp") {
      // can't open directly from a popup, so ask the current tab to open it
      const message: Message = { action: "openApp" };
      browser.tabs.sendMessage(tabId, message);
      window.close();
    } else {
      // update popup state
      setActivated(response.subscriptionActive);
      // tell content script activation happened, and ask to restore fields
      const message: Message = {
        action: "subscriptionActive",
        subscriptionActive: response.subscriptionActive,
      };
      browser.tabs.sendMessage(tabId, message);
    }
  }, []);

  return [activated, onActivate];
}

function Main() {
  const [activated, onActivate] = useActivated();

  return (
    <activatedContext.Provider value={activated}>
      <VStack separator={<StackSeparator />} width="100%">
        <VStack>
          <Text>
            FormKeeper is <ActivatedText />
          </Text>
          {activated === false && (
            <Button onClick={onActivate}>Activate</Button>
          )}
        </VStack>
        <PageDetails />
      </VStack>
    </activatedContext.Provider>
  );
}
