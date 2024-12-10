import * as React from "react";
import { createRoot } from "react-dom/client";
import {
  Code,
  Group,
  Heading,
  HStack,
  IconButton,
  List,
  Spinner,
  StackSeparator,
  Text,
  useSlotRecipe,
  VStack,
} from "@chakra-ui/react";
import { Provider } from "./components/ui/provider";
import { Button } from "./components/ui/button";
import { listSlotRecipe } from "./theme";
import { LuFocus, LuPencilLine, LuSearchCheck } from "react-icons/lu";

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

function FocusSelectorButton({ selector }: { selector: string }) {
  return (
    <IconButton
      aria-label="Focus element"
      title="Focus element"
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
      variant="subtle"
    >
      <LuFocus />
    </IconButton>
  );
}

function RestoreSelectorButton({ selector }: { selector: string }) {
  const activated = React.useContext(activatedContext);
  return (
    <IconButton
      aria-label="Fill element"
      title="Fill element"
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
      variant="subtle"
    >
      <LuPencilLine />
    </IconButton>
  );
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

  const recipe = useSlotRecipe<"root" | "item" | "indicator">({
    recipe: listSlotRecipe,
  });
  const styles = recipe();

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
      content = (
        <>
          <Heading as="h3" size="md">
            Restored fields
          </Heading>
          {data.restoredSoFar.length ? (
            <List.Root css={styles.root}>
              {data.restoredSoFar.map((selector) => (
                <List.Item key={selector} css={styles.item}>
                  <HStack>
                    <Code>{selector}</Code>{" "}
                    <FocusSelectorButton selector={selector} />
                  </HStack>
                </List.Item>
              ))}
            </List.Root>
          ) : (
            <Text>Nothing yet.</Text>
          )}
          <Heading as="h3" size="md">
            Saved fields
          </Heading>
          <details>
            <summary>
              {data.savedForPage.length} item
              {data.savedForPage.length === 1 ? "" : "s"}
            </summary>
            {data.savedForPage.length ? (
              <List.Root css={styles.root}>
                {data.savedForPage.map((selector) => (
                  <List.Item key={selector} css={styles.item}>
                    <HStack>
                      <Code>{selector}</Code>{" "}
                      <FocusSelectorButton selector={selector} />
                      <RestoreSelectorButton selector={selector} />
                    </HStack>
                  </List.Item>
                ))}
              </List.Root>
            ) : (
              <Text>Nothing yet.</Text>
            )}
          </details>
        </>
      );
      break;
  }

  return (
    <VStack align="start" width="100%">
      <Heading as="h2" size="lg">
        Current tab
      </Heading>
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

  const [activated, setActivated] = React.useState<boolean | loading  >(loading);
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


  return [activated, onActivate]
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
