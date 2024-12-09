let subscriptionActive: null | boolean = null;
let isClearing = false;

function makeKey() {
  return `form-saver-${window.location.href}`;
}

function isOptionElement(node: HTMLElement): node is HTMLOptionElement {
  return node.tagName === "OPTION";
}

function isInputElement(node: HTMLElement): node is HTMLInputElement {
  return node.tagName === "INPUT";
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
    }, relaxation);
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

  let elementId = element.getAttribute("id");
  if (elementId) {
    selectorParts.push(`#${elementId}`);
  } else {
    const elSelector: Array<string> = [];

    if (
      isOptionElement(element) ||
      element.type === "checkbox" ||
      element.type === "radio"
    ) {
      const elementValue = element.value;
      if (elementValue) {
        elSelector.push(`[value="${elementValue}"]`);
      }
    }

    if (!isOptionElement(element)) {
      const elementName = element.name;
      if (elementName) {
        elSelector.push(`[name="${elementName}"]`);
      }
    } else {
      const elementName = element.closest("select")?.name;
      if (elementName) {
        selectorParts.push(`[name="${elementName}"]`);
      }
    }

    if (!elSelector.length) {
      return null;
    }

    selectorParts.push(elSelector.join(""));
  }

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
  node: HTMLTextAreaElement | HTMLInputElement | HTMLOptionElement,
  data: Record<string, string>
) {
  if (isClearing) {
    return;
  }
  let elementSelector = getElementSelector(node);
  if (!elementSelector) {
    return;
  }
  if (isOptionElement(node)) {
    data[elementSelector] = node.selected ? "selected" : "";
    console.debug("persisted selection for", elementSelector, node);
  } else if (node.type === "checkbox" || node.type === "radio") {
    data[elementSelector] = (node as HTMLInputElement).checked ? "checked" : "";
    console.debug("persisted check for", elementSelector, node);
  } else if (node.value) {
    data[elementSelector] = node.value;
    console.debug("persisted value for", elementSelector, node);
  } else {
    delete data[elementSelector];
    console.debug("removed persisted value for", elementSelector, node);
  }
}

function restoreData(
  node: HTMLTextAreaElement | HTMLInputElement | HTMLOptionElement,
  value: string
) {
  if (!subscriptionActive) {
    return;
  }
  if (isOptionElement(node)) {
    node.selected = value === "selected";
    console.debug("restored selection to", node);
  } else if (node.type === "checkbox" || node.type === "radio") {
    (node as HTMLInputElement).checked = value === "checked";
    console.debug("restored check to", node);
  } else if (!node.value) {
    // don't overwrite if the site has prefilled
    node.value = value || "";
    console.debug("restored value to", node);
  }
}

function findFormElements(
  node: Node
): Array<HTMLTextAreaElement | HTMLInputElement | HTMLOptionElement> {
  if (!(node instanceof HTMLElement)) {
    return [];
  }
  if (node.tagName === "TEXTAREA") {
    return [node as HTMLTextAreaElement];
  }
  if (node.tagName === "INPUT") {
    return [node as HTMLInputElement].filter(
      (node) => !(node.type === "password" || node.type === "hidden")
    );
  }
  if (node.tagName === "SELECT") {
    return Array.from(node.querySelectorAll("option"));
  }
  return Array.from(
    (node.querySelectorAll?.("textarea, input, select option") as NodeListOf<
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
  if (node.tagName === "TEXTAREA") {
    return [node as HTMLTextAreaElement];
  }
  if (node.tagName === "INPUT") {
    return [node as HTMLInputElement].filter(
      (node) => node.type !== "password"
    );
  }
  if (node.tagName === "SELECT") {
    return [node as HTMLSelectElement];
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

    findFormElements(form).forEach((node) => {
      let elementSelector = getElementSelector(node);
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

  findChangableElements(root).forEach((node) => {
    // use request idle callback to persist data from this element.
    // if the element is already queued, cancel the last

    node.addEventListener("change", () => {
      if (node.tagName === "SELECT") {
        node.querySelectorAll("option").forEach((option) => {
          let selector = getElementSelector(option);
          if (!selector) {
            return;
          }
          toSaveSelectors.add(selector);
        });
      } else {
        let selector = getElementSelector(node);
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
      .filter((node) => !node.value);
    const removed = Array.from(mutation.removedNodes)
      .flatMap(findFormElements)
      .filter((node) => node.value);
    if (added.length || removed.length) {
      // defer cost of JSON.parse to when we actually need it
      const pageKey = makeKey();
      const data =
        (JSON.parse(localStorage.getItem(pageKey) ?? "{}") as
          | undefined
          | Record<string, string>) || {};
      added.forEach((node) => {
        let elementSelector = getElementSelector(node);
        if (!elementSelector) {
          return;
        }
        restoreData(node, data[elementSelector]);
      });
      removed.forEach((node) => {
        persistData(node, data);
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
  findFormElements(document.body).forEach((node) => {
    persistData(node, data);
  });

  localStorage.setItem(makeKey(), JSON.stringify(data));
});

function restoreAll() {
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
  (message: Message, sender, sendResponse) => {
    if (message.action === "clear") {
      if (window.confirm("Clear saved form data for this page and reload?")) {
        localStorage.removeItem(makeKey());
        isClearing = true;
        window.location.reload();
      }
    }
  }
);

browser.runtime
  .sendMessage({ action: "checkActiveSubscription" })
  .then((response: { echo: unknown; subscriptionActive: boolean }) => {
    if (!response) {
      return;
    }
    subscriptionActive = response.subscriptionActive;
    restoreAll();
  });
