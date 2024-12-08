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
    message: any,
    responseHandler?: (response: unknown) => void
  ): Promise<any>;
}
