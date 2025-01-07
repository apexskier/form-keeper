type Message =
  | {
      action:
        | "clear"
        | "checkActiveSubscription"
        | "activate"
        | "openApp"
        | "getSaved";
    }
  | {
      action: "copyToClipboard";
      type: "text" | "html";
      data: string;
    }
  | {
      action: "focusElement" | "copyElement" | "fillElement" | "forgetElement";
      selector: string;
    }
  | {
      action: "subscriptionActive";
      subscriptionActive: boolean;
    };

interface MainPayload {
  watching: Array<{
    selector: string;
    visible: boolean;
  }>;
  restoredSoFar: Array<{
    selector: string;
    visible: boolean;
  }>;
  savedForPage: Array<{
    selector: string;
    present: boolean;
    visible: boolean;
    content: string;
  }>;
}

declare namespace browser.runtime {
  /**
   * Send a single message to a native application.
   *
   * Not allowed in: Devtools pages
   * @param application The name of the native messaging host.
   * @param message The message that will be passed to the native messaging host.
   */
  function sendNativeMessage(
    application: string,
    message: Message,
    responseHandler?: (response: unknown) => void
  ): Promise<unknown>;

  function sendMessage(
    message: Message,
    options?: _SendMessageOptions
  ): Promise<unknown>;
  function sendMessage(
    extensionId: string,
    message: Message,
    options?: _SendMessageOptions
  ): Promise<unknown>;
}
