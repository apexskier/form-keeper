let subscriptionActive: null | boolean = null;
let isClearing = false;

function makeKey() {
  return `form-saver-${window.location.href}`;
}

function isOptionElement(element: HTMLElement): element is HTMLOptionElement {
  return element.tagName === "OPTION";
}

function isInputElement(element: HTMLElement): element is HTMLInputElement {
  return element.tagName === "INPUT";
}

function isTextAreaElement(
  element: HTMLElement
): element is HTMLTextAreaElement {
  return element.tagName === "TEXTAREA";
}

function isSelectElement(element: HTMLElement): element is HTMLSelectElement {
  return element.tagName === "SELECT";
}

if (!window.requestIdleCallback) {
  window.requestIdleCallback = function (callback, _options) {
    const options = _options || {};
    const relaxation = 1;
    const timeout = options.timeout || relaxation;
    var start = performance.now();
    return setTimeout(function () {
      callback({
        get didTimeout() {
          return options.timeout
            ? false
            : performance.now() - start - relaxation > timeout;
        },
        timeRemaining: function () {
          return Math.max(0, relaxation + (performance.now() - start));
        },
      });
    }, relaxation) as unknown as number;
  };
}

if (!window.cancelIdleCallback) {
  window.cancelIdleCallback = function (id) {
    clearTimeout(id);
  };
}

function getElementSelector(
  element:
    | HTMLTextAreaElement
    | HTMLInputElement
    | HTMLOptionElement
    | HTMLSelectElement
) {
  let selectorParts: Array<string> = [];
  let formId = element.closest("form")?.getAttribute("id");
  if (formId) {
    selectorParts.push(`#${formId}`);
  }

  let elSelectorParts = [element.tagName.toLowerCase()];
  if (element.getAttribute("type")) {
    elSelectorParts.push(`[type="${element.getAttribute("type")}"]`);
  }
  let elementId = element.getAttribute("id");
  if (elementId) {
    elSelectorParts.push(`#${elementId}`);
  } else {
    if (
      isOptionElement(element) ||
      element.type === "checkbox" ||
      element.type === "radio"
    ) {
      const elementValue = element.value;
      if (elementValue) {
        elSelectorParts.push(`[value="${elementValue}"]`);
      }
    }

    function getNameComponent(
      element: null | HTMLTextAreaElement | HTMLInputElement | HTMLSelectElement
    ) {
      if (!element) {
        return;
      }
      const elementName = element.name;
      if (elementName) {
        elSelectorParts.push(`[name="${elementName}"]`);
        return;
      }

      // this is non-standard, but shows up in a bunch of google things
      const jsname = element.getAttribute("jsname");
      if (jsname) {
        elSelectorParts.push(`[jsname="${jsname}"]`);
        return;
      }
    }

    if (!isOptionElement(element)) {
      getNameComponent(element);
    } else {
      getNameComponent(element.closest("select"));
    }
  }

  selectorParts.push(elSelectorParts.join(""));

  let selector = selectorParts.join(" ");

  try {
    if (document.querySelectorAll(selector).length !== 1) {
      console.warn(`selector matches multiple or none: ${selector}`);
      return null;
    }
  } catch (error) {
    console.error(`invalid selector: ${selector}`);
    return null;
  }

  return selector;
}

function persistData(
  element: HTMLTextAreaElement | HTMLInputElement | HTMLOptionElement,
  data: Record<string, string>
) {
  if (isClearing) {
    return;
  }
  let elementSelector = getElementSelector(element);
  if (!elementSelector) {
    return;
  }
  if (isOptionElement(element)) {
    data[elementSelector] = element.selected ? "selected" : "";
    console.debug("persisted selection for", elementSelector, element);
  } else if (element.type === "checkbox" || element.type === "radio") {
    data[elementSelector] = (element as HTMLInputElement).checked
      ? "checked"
      : "";
    console.debug("persisted check for", elementSelector, element);
  } else if (element.value) {
    data[elementSelector] = element.value;
    console.debug("persisted value for", elementSelector, element);
  } else {
    delete data[elementSelector];
    console.debug("removed persisted value for", elementSelector, element);
  }
}

const restoredSoFar: Array<string> = [];

function restoreData(
  element: HTMLTextAreaElement | HTMLInputElement | HTMLOptionElement,
  value: string,
  overwrite: boolean = false
) {
  if (isOptionElement(element)) {
    const from = element.selected;
    const to = value === "selected";
    if (from !== to) {
      element.selected = to;
      console.debug("restored selection to", element);
      restoredSoFar.push(getElementSelector(element)!);
    }
  } else if (element.type === "checkbox" || element.type === "radio") {
    const from = (element as HTMLInputElement).checked;
    const to = value === "checked";
    if (from !== to) {
      (element as HTMLInputElement).checked = to;
      console.debug("restored check to", element);
      restoredSoFar.push(getElementSelector(element)!);
    }
  } else if (overwrite || !element.value) {
    // don't overwrite if the site has prefilled
    const from = element.value;
    const to = value || "";
    if (from !== to) {
      element.value = to;
      console.debug("restored value to", element);
      restoredSoFar.push(getElementSelector(element)!);
    }
  }
}

function findFormElements(
  node: Node
): Array<HTMLTextAreaElement | HTMLInputElement | HTMLOptionElement> {
  if (!(node instanceof HTMLElement)) {
    return [];
  }
  if (isTextAreaElement(node)) {
    return [node];
  }
  if (isInputElement(node)) {
    return [node].filter(
      (node) => !(node.type === "password" || node.type === "hidden")
    );
  }
  if (isSelectElement(node)) {
    return Array.from(node.querySelectorAll("option"));
  }
  return Array.from(
    (node.querySelectorAll?.(`textarea, input, select option`) as NodeListOf<
      HTMLTextAreaElement | HTMLInputElement | HTMLOptionElement
    >) ?? []
  ).filter(
    (node) =>
      !(
        isInputElement(node) &&
        (node.type === "password" || node.type === "hidden")
      )
  );
}

function findChangableElements(
  node: Node
): Array<HTMLTextAreaElement | HTMLInputElement | HTMLSelectElement> {
  if (!(node instanceof HTMLElement)) {
    return [];
  }
  if (isTextAreaElement(node)) {
    return [node];
  }
  if (isInputElement(node)) {
    return [node].filter((node) => node.type !== "password");
  }
  if (isSelectElement(node)) {
    return [node];
  }
  return Array.from(
    (node.querySelectorAll?.("textarea, input, select") as NodeListOf<
      HTMLTextAreaElement | HTMLInputElement | HTMLSelectElement
    >) ?? []
  ).filter((node) => !(isInputElement(node) && node.type === "password"));
}

function wipeOnSubmit(form: HTMLFormElement) {
  form.addEventListener("submit", () => {
    const pageKey = makeKey();
    const data =
      (JSON.parse(localStorage.getItem(pageKey) ?? "{}") as
        | undefined
        | Record<string, string>) || {};

    findFormElements(form).forEach((element) => {
      let elementSelector = getElementSelector(element);
      if (!elementSelector) {
        return;
      }
      delete data[elementSelector];
    });
    localStorage.setItem(pageKey, JSON.stringify(data));
  });
}

const toSaveSelectors = new Set<string>();
let toSaveIdleCallback: number = -1;

function setupEventHandlers(root: HTMLElement) {
  // wipe form data on submit
  if (root.tagName === "FORM") {
    wipeOnSubmit(root as HTMLFormElement);
  } else {
    root.querySelectorAll("form").forEach(wipeOnSubmit);
  }

  findChangableElements(root).forEach((element) => {
    // use request idle callback to persist data from this element.
    // if the element is already queued, cancel the last

    element.addEventListener("change", () => {
      if (isSelectElement(element)) {
        element.querySelectorAll("option").forEach((option) => {
          let selector = getElementSelector(option);
          if (!selector) {
            return;
          }
          toSaveSelectors.add(selector);
        });
      } else {
        let selector = getElementSelector(element);
        if (!selector) {
          return;
        }
        toSaveSelectors.add(selector);
      }

      window.cancelIdleCallback(toSaveIdleCallback);

      toSaveIdleCallback = window.requestIdleCallback(() => {
        const pageKey = makeKey();
        const data =
          (JSON.parse(localStorage.getItem(pageKey) ?? "{}") as
            | undefined
            | Record<string, string>) || {};
        toSaveSelectors.forEach((selector) => {
          try {
            const element = document.querySelector(selector) as
              | HTMLInputElement
              | HTMLTextAreaElement
              | HTMLOptionElement;
            if (!element) {
              return;
            }
            persistData(element, data);
          } catch (error) {
            console.log("failed to persist data");
            console.error(error);
          }
        });
        toSaveSelectors.clear();
        localStorage.setItem(pageKey, JSON.stringify(data));
      });
    });
  });
}

let mutationObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type !== "childList") {
      return;
    }
    mutation.addedNodes.forEach((node) => {
      if (node instanceof HTMLElement) {
        setupEventHandlers(node);
      }
    });

    const added = Array.from(mutation.addedNodes)
      .flatMap(findFormElements)
      .filter((element) => !element.value);
    const removed = Array.from(mutation.removedNodes)
      .flatMap(findFormElements)
      .filter((element) => element.value);
    if (added.length || removed.length) {
      // defer cost of JSON.parse to when we actually need it
      const pageKey = makeKey();
      const data =
        (JSON.parse(localStorage.getItem(pageKey) ?? "{}") as
          | undefined
          | Record<string, string>) || {};
      if (subscriptionActive) {
        added.forEach((element) => {
          let elementSelector = getElementSelector(element);
          if (!elementSelector) {
            return;
          }
          restoreData(element, data[elementSelector]);
        });
      }
      removed.forEach((element) => {
        // persistData(element, data);
      });
      localStorage.setItem(pageKey, JSON.stringify(data));
    }
  });
});

// watch for dom changes to persist and restore dynamic content
mutationObserver.observe(document.body, {
  childList: true,
  subtree: true,
});

window.addEventListener("pagehide", () => {
  // save all form data

  const savedData = localStorage.getItem(makeKey()) || "{}";
  const data =
    (JSON.parse(savedData) as undefined | Record<string, string>) || {};
  findFormElements(document.body).forEach((element) => {
    // persistData(element, data);
  });

  localStorage.setItem(makeKey(), JSON.stringify(data));
});

function restoreAll() {
  if (!subscriptionActive) {
    return;
  }
  const savedData = localStorage.getItem(makeKey());
  if (savedData) {
    Object.entries(
      (JSON.parse(savedData) as undefined | Record<string, string>) || {}
    ).forEach(([selector, value]) => {
      try {
        const element = document.querySelector(selector);
        if (!element) {
          return;
        }
        restoreData(
          element as HTMLTextAreaElement | HTMLInputElement | HTMLOptionElement,
          value
        );
      } catch (error) {
        console.log("failed to restore data");
        console.error(error);
      }
    });
  }
}

setupEventHandlers(document.body);

browser.runtime.onMessage.addListener(
  async (message: Message, sender, sendResponse) => {
    function respondWithPayload(data: Record<string, string>) {
      let presentElements = Object.fromEntries(
        findFormElements(document.body)
          .map((element) => [getElementSelector(element), element])
          .filter(
            (
              v
            ): v is [
              string,
              HTMLTextAreaElement | HTMLInputElement | HTMLOptionElement
            ] => !!v[0]
          )
      );
      let selectors = new Set([
        ...Object.keys(data),
        ...Object.keys(presentElements),
      ]);

      sendResponse({
        elements: Array.from(selectors).map((selector) => {
          let element =
            presentElements[selector] ?? document.querySelector(selector);
          return {
            selector,
            presense: element
              ? element.checkVisibility()
                ? "visible"
                : "present"
              : null,
            savedContent: data[selector],
            restored: restoredSoFar.includes(selector),
          };
        }),
      } as MainPayload);
    }

    switch (message.action) {
      case "clear": {
        if (window.confirm("Clear saved form data for this page and reload?")) {
          localStorage.removeItem(makeKey());
          isClearing = true;
          window.location.reload();
        }
        break;
      }
      case "forgetElement": {
        const pageKey = makeKey();
        const data =
          (JSON.parse(localStorage.getItem(pageKey) ?? "{}") as
            | undefined
            | Record<string, string>) || {};
        delete data[message.selector];
        localStorage.setItem(pageKey, JSON.stringify(data));
        respondWithPayload(data);
        break;
      }
      case "openApp": {
        document.location = "form-keeper://activate";
        break;
      }
      case "getSaved": {
        const pageKey = makeKey();
        const data =
          (JSON.parse(localStorage.getItem(pageKey) ?? "{}") as
            | undefined
            | Record<string, string>) || {};
        respondWithPayload(data);
        break;
      }
      case "focusElement": {
        const element = document.querySelector(message.selector);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          if (element instanceof HTMLElement) {
            element.focus();
            if (isTextAreaElement(element) || isInputElement(element)) {
              element.select();
            }
          }
        }
        break;
      }
      case "fillElement": {
        if (!(await checkSubscriptionStatus())) {
          alert("Please activate FormKeeper to use this feature");
          return;
        }
        const element = document.querySelector(message.selector) as
          | HTMLTextAreaElement
          | HTMLInputElement
          | HTMLOptionElement;
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          // defer cost of JSON.parse to when we actually need it
          const pageKey = makeKey();
          const data =
            (JSON.parse(localStorage.getItem(pageKey) ?? "{}") as
              | undefined
              | Record<string, string>) || {};
          restoreData(element, data[message.selector], true);
          if (element instanceof HTMLElement) {
            element.focus();
            if (isTextAreaElement(element) || isInputElement(element)) {
              element.select();
            }
          }
        }
        break;
      }
      case "copyElement": {
        if (!(await checkSubscriptionStatus())) {
          alert("Please activate FormKeeper to use this feature");
          return;
        }
        const pageKey = makeKey();
        const data =
          (JSON.parse(localStorage.getItem(pageKey) ?? "{}") as
            | undefined
            | Record<string, string>) || {};
        browser.runtime.sendMessage({
          action: "copyToClipboard",
          type: "text",
          data: data[message.selector],
        });
        break;
      }
      case "subscriptionActive": {
        subscriptionActive = message.subscriptionActive;
        restoreAll();
        break;
      }
      default:
        console.warn("unexpected message", message.action);
    }
  }
);

async function checkSubscriptionStatus(): Promise<boolean | null> {
  const response = (await browser.runtime.sendMessage({
    action: "checkActiveSubscription",
  })) as { echo: unknown; subscriptionActive: boolean };
  if (!response) {
    return null;
  }
  subscriptionActive = response.subscriptionActive;
  return subscriptionActive;
}

checkSubscriptionStatus().then(() => {
  restoreAll();
});
