// boot.js: Final boot step — listen for kernel ready, then hand off to disk manager

console.log("[boot] Module loaded");

addEventListener("kernel:ready", () => {
  console.log("[boot] Kernel ready — disk manager will take over");
  // diskman.js handles the ros:ui:start event after a disk is mounted/created
});

// Once the UI is cleared to start, notify all modules that care
addEventListener("ros:ui:start", () => {
  console.log("[boot] ros:ui:start — desktop coming up");
});
