// ipc.js: Simple event-based message bus

console.log("[ipc] Module loaded");

ros.ipc = {
  send(channel, data) {
    document.dispatchEvent(new CustomEvent(`ipc:${channel}`, { detail: data }));
  },
  receive(channel, handler) {
    document.addEventListener(`ipc:${channel}`, (e) => handler(e.detail));
  }
};
