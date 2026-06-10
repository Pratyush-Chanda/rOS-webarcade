// events.js: Global dispatcher helper (optional)

console.log("[events] Module loaded");

ros.events = {
  emit(name, data) {
    dispatchEvent(new CustomEvent(name, { detail: data }));
  },
  on(name, fn) {
    addEventListener(name, (e) => fn(e.detail));
  }
};
