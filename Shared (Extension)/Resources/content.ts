(function () {
  function makeKey() {
    return `form-saver-${window.location.href}`;
  }

  function getElementId(element: HTMLTextAreaElement | HTMLInputElement) {
    let keyParts = [];
    let formId = element.closest("form")?.id;
    if (formId) {
      keyParts.push(`#${formId}`);
    }
    let elementId = element.id;
    if (elementId) {
      keyParts.push(`#${elementId}`);
    } else {
      let elementName = element.name;
      if (elementName) {
        keyParts.push(`[name="${elementName}"]`);
      }
    }
    return keyParts.join(" ");
  }

  function saveContents() {
    const savedData = localStorage.getItem(makeKey());
    if (!savedData) return;
    const data =
      (JSON.parse(savedData) as undefined | Record<string, string>) || {};
    findFormElements(document).forEach((node) => {
      if (node.value) {
        data[getElementId(node)] = node.value;
      } else {
        delete data[getElementId(node)];
      }
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
      const node = document.querySelector(selector) as
        | HTMLTextAreaElement
        | HTMLInputElement;
      if (!node?.value && value) {
        node.value = value;
      }
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
        delete data[getElementId(node)];
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
      console.log(mutation);
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
          if (node.value) return;
          node.value = data[getElementId(node)] || "";
        });
        removed.forEach((node) => {
          if (node.value) {
            data[getElementId(node)] = node.value;
          } else {
            delete data[getElementId(node)];
          }
          localStorage.setItem(pageKey, JSON.stringify(data));
        });
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
