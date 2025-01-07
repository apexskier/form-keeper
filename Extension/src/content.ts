let subscriptionActive: null | boolean = null;
let isClearing = false;

function assert(condition: boolean, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

function makeKey() {
  return `form-saver-${window.location.href}`;
}

function isFormElement(element: HTMLElement): element is HTMLFormElement {
  return element.tagName === "FORM";
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

function getElementValue(element: HTMLElement) {
  if (isOptionElement(element)) {
    return element.selected;
  }
  if (isInputElement(element)) {
    return element.value;
  }
  return element.innerHTML;
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

function getIdSelector(element: HTMLElement) {
  let id = element.getAttribute("id");
  if (id) {
    try {
      document.querySelector(`#${id}`);
      return `#${id}`;
    } catch (error) {
      return `[id="${id}"]`;
    }
  }
  return null;
}

function getNameSelector(element: HTMLElement): string | null {
  const elementName = element.getAttribute("name");
  if (elementName) {
    return `[name="${elementName}"]`;
  }

  // this is non-standard, but shows up in a bunch of google things
  const jsname = element.getAttribute("jsname");
  if (jsname) {
    return `[jsname="${jsname}"]`;
  }

  return null;
}

function getElementSelector(element: HTMLElement) {
  const selectorParts: Array<string> = [];

  if (isFormElement(element)) {
    const form = element.closest("form");
    if (form) {
      const formId = getIdSelector(form);
      if (formId) {
        selectorParts.push(formId);
      }
    }
  }

  if (isOptionElement(element)) {
    const select = element.closest("select");
    if (select) {
      const selectId = getIdSelector(select);
      if (selectId) {
        selectorParts.push(selectId);
      } else {
        const nameSelector = getNameSelector(select);
        if (nameSelector) {
          selectorParts.push(`select${nameSelector}`);
        }
      }
    }
  }

  let elSelectorParts = [element.tagName.toLowerCase()];
  let elementId = getIdSelector(element);
  if (elementId) {
    elSelectorParts.push(elementId);
  } else {
    if (element.getAttribute("type")) {
      elSelectorParts.push(`[type="${element.getAttribute("type")}"]`);
    }

    if (
      isOptionElement(element) ||
      (isInputElement(element) &&
        (element.type === "checkbox" || element.type === "radio"))
    ) {
      const elementValue = element.value;
      if (elementValue) {
        elSelectorParts.push(`[value="${elementValue}"]`);
      }
    }

    const nameSelector = getNameSelector(element);
    if (nameSelector) {
      elSelectorParts.push(nameSelector);
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
  element: HTMLElement,
  selector: string,
  data: Record<string, string>
) {
  if (isClearing) {
    return;
  }
  if (isOptionElement(element)) {
    data[selector] = element.selected ? "selected" : "";
    console.debug("persisted selection for", selector, element);
  } else if (isInputElement(element) || isTextAreaElement(element)) {
    if (element.type === "checkbox" || element.type === "radio") {
      data[selector] = (element as HTMLInputElement).checked ? "checked" : "";
      console.debug("persisted check for", selector, element);
    } else if (element.value) {
      data[selector] = element.value;
      console.debug("persisted value for", selector, element);
    } else {
      delete data[selector];
      console.debug("removed persisted value for", selector, element);
    }
  } else {
    assert(
      element.getAttribute("contenteditable") === "true" ||
        element.getAttribute("contenteditable") === "plaintext-only"
    );
    data[selector] = element.innerHTML;
    console.debug("persisted value for", selector, element);
  }
}

const restoredSoFar: Array<string> = [];

function restoreData(
  element: HTMLElement,
  selector: string,
  value: string,
  overwrite: boolean = false
) {
  if (isOptionElement(element)) {
    const from = element.selected;
    const to = value === "selected";
    if (from !== to) {
      element.selected = to;
      console.debug("restored selection to", element);
      restoredSoFar.push(selector);
    }
  } else if (isInputElement(element) || isTextAreaElement(element)) {
    if (element.type === "checkbox" || element.type === "radio") {
      const from = (element as HTMLInputElement).checked;
      const to = value === "checked";
      if (from !== to) {
        (element as HTMLInputElement).checked = to;
        console.debug("restored check to", element);
        restoredSoFar.push(selector);
      }
    } else if (overwrite || !element.value) {
      // don't overwrite if the site has prefilled
      const from = element.value;
      const to = value || "";
      if (from !== to) {
        element.value = to;
        console.debug("restored value to", element);
        restoredSoFar.push(selector);
      }
    }
  } else {
    assert(
      element.getAttribute("contenteditable") === "true" ||
        element.getAttribute("contenteditable") === "plaintext-only"
    );
    const from = element.innerHTML;
    const to = value || "";
    if (from !== to) {
      element.innerHTML = to;
      console.debug("restored value to", element);
        restoredSoFar.push(selector);
    }
  }
}

function filterInputTypes(element: HTMLInputElement) {
  return !(
    element.type === "password" ||
    element.type === "hidden" ||
    element.type === "file"
  );
}

function filterFormInputTypes(element: HTMLElement) {
  return !(isInputElement(element) && !filterInputTypes(element));
}

function filterToSelectable(elements: Array<HTMLElement>) {
  return elements
    .map((element) => {
      let selector = getElementSelector(element);
      if (!selector) {
        return null;
      }
      return [element, selector];
    })
    .filter((v): v is [HTMLElement, string] => v !== null);
}

function findFormElements(node: Node): Array<[HTMLElement, string]> {
  return filterToSelectable([
    ...findChangableElements(node).flatMap<
      HTMLTextAreaElement | HTMLInputElement | HTMLOptionElement
    >((element) => {
      if (isSelectElement(element)) {
        return Array.from(
          element.querySelectorAll("option") as NodeListOf<HTMLOptionElement>
        );
      }
      return [element];
    }),
    ...findContentEditableElements(node),
  ]);
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
    return [node].filter(filterInputTypes);
  }
  if (isSelectElement(node)) {
    return [node];
  }
  return Array.from(
    (node.querySelectorAll?.("textarea, input, select") as NodeListOf<
      HTMLTextAreaElement | HTMLInputElement | HTMLSelectElement
    >) ?? []
  ).filter(filterFormInputTypes);
}

function findContentEditableElements(node: Node): Array<HTMLElement> {
  if (!(node instanceof HTMLElement)) {
    return [];
  }
  let contenteditable = node.getAttribute("contenteditable");
  if (contenteditable && contenteditable !== "false") {
    return [node];
  }
  return Array.from(
    (node.querySelectorAll?.(
      `[contenteditable="true"], [contenteditable="plaintext-only"]`
    ) as NodeListOf<HTMLElement>) ?? []
  );
}

function wipeOnSubmit(form: HTMLFormElement) {
  form.addEventListener("submit", () => {
    const pageKey = makeKey();
    const data =
      (JSON.parse(localStorage.getItem(pageKey) ?? "{}") as
        | undefined
        | Record<string, string>) || {};

    findFormElements(form).forEach(([, selector]) => {
      delete data[selector];
    });
    localStorage.setItem(pageKey, JSON.stringify(data));
  });
}

const toSaveSelectors = new Set<string>();
let toSaveIdleCallback: number = -1;

function setupEventHandlers(root: HTMLElement) {
  // wipe form data on submit
  if (isFormElement(root)) {
    wipeOnSubmit(root as HTMLFormElement);
  } else {
    root.querySelectorAll("form").forEach(wipeOnSubmit);
  }

  function queueToSave() {
    window.cancelIdleCallback(toSaveIdleCallback);

    toSaveIdleCallback = window.requestIdleCallback(() => {
      const pageKey = makeKey();
      const data =
        (JSON.parse(localStorage.getItem(pageKey) ?? "{}") as
          | undefined
          | Record<string, string>) || {};
      toSaveSelectors.forEach((selector) => {
        try {
          const element = document.querySelector(selector) as HTMLElement;
          if (!element) {
            return;
          }
          persistData(element, selector, data);
        } catch (error) {
          console.log("failed to persist data");
          console.error(error);
        }
      });
      toSaveSelectors.clear();
      localStorage.setItem(pageKey, JSON.stringify(data));
    });
  }

  findContentEditableElements(root).forEach((element) => {
    element.addEventListener("input", () => {
      let selector = getElementSelector(element);
      if (!selector) {
        return;
      }
      toSaveSelectors.add(selector);

      queueToSave();
    });
  });

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

      queueToSave();
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
    const removed = Array.from(mutation.removedNodes)
      .flatMap(findFormElements)
    if (added.length || removed.length) {
      // defer cost of JSON.parse to when we actually need it
      const pageKey = makeKey();
      const data =
        (JSON.parse(localStorage.getItem(pageKey) ?? "{}") as
          | undefined
          | Record<string, string>) || {};
      if (subscriptionActive) {
        added.forEach(([element, selector]) => {
          restoreData(element, selector, data[selector]);
        });
      }
      removed.forEach(([element, selector]) => {
        persistData(element, selector, data);
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
  findFormElements(document.body).forEach(([element, selector]) => {
    persistData(element, selector, data);
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
          selector,
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
        findFormElements(document.body).map(([element, selector]) => [
          selector,
          element,
        ])
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
              element.setSelectionRange(0, element.value.length);
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
        const element = document.querySelector(message.selector) as HTMLElement;
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          // defer cost of JSON.parse to when we actually need it
          const pageKey = makeKey();
          const data =
            (JSON.parse(localStorage.getItem(pageKey) ?? "{}") as
              | undefined
              | Record<string, string>) || {};
          restoreData(element, message.selector, data[message.selector], true);
          if (element instanceof HTMLElement) {
            element.focus();
            if (isTextAreaElement(element) || isInputElement(element)) {
              element.select();
              element.setSelectionRange(0, element.value.length);
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
