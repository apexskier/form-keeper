(function () {
  function makeKey() {
    return `form-saver-${window.location.href}`;
  }

  function getElementSelector(element: HTMLTextAreaElement | HTMLInputElement) {
    let keyParts: Array<string> = [];
    let formId = element.closest("form")?.id;
    if (formId) {
      keyParts.push(`#${formId}`);
    }

    let elementId = element.id;
    if (elementId) {
      keyParts.push(`#${elementId}`);
    } else {
      const elSelector: Array<string> = [];
      const elementName = element.name;
      if (elementName) {
        elSelector.push(`[name="${elementName}"]`);
      }

      if (element.type === "checkbox" || element.type === "radio") {
        const elementValue = element.value;
        if (elementValue) {
          elSelector.push(`[value="${elementValue}"]`);
        }
      }

      if (!elSelector.length) {
        return null;
      }

      keyParts.push(elSelector.join(""));
    }

    return keyParts.join(" ");
  }

  function persistData(
    node: HTMLTextAreaElement | HTMLInputElement,
    data: Record<string, string>
  ) {
    let elementSelector = getElementSelector(node);
    if (!elementSelector) {
      return;
    }
    if (node.type === "checkbox" || node.type === "radio") {
      data[elementSelector] = (node as HTMLInputElement).checked
        ? "checked"
        : "";
    } else if (node.value) {
      data[elementSelector] = node.value;
    } else {
      delete data[elementSelector];
    }
  }

  function restoreData(
    node: HTMLTextAreaElement | HTMLInputElement,
    value: string
  ) {
    if (node.type === "checkbox" || node.type === "radio") {
      (node as HTMLInputElement).checked = value === "checked";
      return;
    }
    // don't overwrite if the site has prefilled
    if (node.value) return;
    node.value = value;
  }

  function saveContents() {
    const savedData = localStorage.getItem(makeKey());
    if (!savedData) return;
    const data =
      (JSON.parse(savedData) as undefined | Record<string, string>) || {};
    findFormElements(document.body).forEach((node) => {
      persistData(node, data);
    });

    localStorage.setItem(makeKey(), JSON.stringify(data));
  }

  // Restore contents from localStorage
  function restoreTextAreas() {
    const savedData = localStorage.getItem(makeKey());
    if (!savedData) return;
    const data =
      (JSON.parse(savedData) as undefined | Record<string, string>) || {};
    Object.entries(data).forEach(([selector, value]) => {
      restoreData(
        document.querySelector(selector) as
          | HTMLTextAreaElement
          | HTMLInputElement,
        value
      );
    });
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

  function findFormElements(
    node: Node
  ): Array<HTMLTextAreaElement | HTMLInputElement> {
    if (!(node instanceof HTMLElement)) {
      return [];
    }
    if (node.tagName === "TEXTAREA") {
      return [node as HTMLTextAreaElement];
    }
    if (node.tagName === "INPUT") {
      return [node as HTMLInputElement];
    }
    return Array.from(node.querySelectorAll?.("textarea, input") ?? []);
  }

  let mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type !== "childList") {
        return;
      }
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          node.querySelectorAll?.("form").forEach(wipeOnSubmit);
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

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Listen for page unload to save textareas
  window.addEventListener("beforeunload", saveContents);

  // Restore textareas on page load
  restoreTextAreas();
  document.querySelectorAll("form").forEach(wipeOnSubmit);
})();
