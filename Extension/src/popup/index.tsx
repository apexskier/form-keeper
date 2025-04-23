import * as React from "react";
import { createRoot } from "react-dom/client";
import {
  ButtonProps,
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
    <PageDetails />
  </Provider>
);

const loading = Symbol("loading");
type loading = typeof loading;
const failed = Symbol("failed");
type failed = typeof failed;

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
  ...props
}: { selector: string } & ButtonProps) {
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
      {...props}
    >
      <LuFocus />
    </IconButton>
  );
}

function RestoreSelectorButton({
  selector,
  ...props
}: { selector: string } & ButtonProps) {
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
      }, [])}
      size="xs"
      variant="outline"
      {...props}
    >
      <LuPencilLine />
    </IconButton>
  );
}

function CopySelectorContentButton({
  selector,
  ...props
}: { selector: string } & ButtonProps) {
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
      }, [])}
      size="xs"
      variant="outline"
      {...props}
    >
      <LuClipboardCopy />
    </IconButton>
  );
}

function ForgetSelectorContentButton({
  selector,
  onResponse,
  ...props
}: {
  selector: string;
  onResponse: (data: MainPayload) => void;
} & ButtonProps) {
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
      }, [])}
      size="xs"
      variant="outline"
      {...props}
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
        <Table.ScrollArea>
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
                      <Code
                        colorPalette={
                          restored
                            ? "green"
                            : presense !== null && savedContent
                            ? "yellow"
                            : undefined
                        }
                      >
                        {selector}
                      </Code>
                    </Table.Cell>
                    <Table.Cell textAlign="end">
                      <Group attached>
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
        </Table.ScrollArea>
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
