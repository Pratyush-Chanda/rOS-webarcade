// power.js: System-level power actions

console.log("[power] Module loaded");

function showPowerScreen(text, callback) {
  if (document.getElementById("ros-power-screen")) return;

  const overlay = document.createElement("div");
  overlay.id = "ros-power-screen";
  overlay.innerHTML = `<div class="ros-power-message">${text}</div>`;
  Object.assign(overlay.style, {
    position:       "fixed",
    inset:          "0",
    background:     "black",
    color:          "white",
    fontSize:       "2.5rem",
    fontFamily:     "sans-serif",
    display:        "flex",
    justifyContent: "center",
    alignItems:     "center",
    opacity:        "0",
    zIndex:         "99999",
    transition:     "opacity 1s ease-in"
  });

  document.body.appendChild(overlay);
  requestAnimationFrame(() => { overlay.style.opacity = "1"; });
  setTimeout(callback, 2000);
}

ros.power = {
  shutdown() {
    console.log("[power] Shutdown requested");
    showPowerScreen("Goodbye!", () => {
      if (ros.tauri?.available) {
        ros.tauri.exitApp();
        return;
      }

      // window.close() only succeeds if this tab was opened by a script
      // (e.g. window.open() from a launcher). Browsers deliberately block
      // a page from closing a tab the user opened themselves (typed URL,
      // bookmark, link) — there's no JS workaround for that, it's a
      // security boundary. So: try it (covers the popup case), and if
      // we're still here shortly after, show the "close it yourself"
      // message inside our own shutdown screen instead of a jarring
      // native alert() on top of it.
      window.close();

      setTimeout(() => {
        const msg = document.querySelector("#ros-power-screen .ros-power-message");
        if (!msg) return;
        const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
        msg.innerHTML = `
          Goodbye!
          <div style="font-size:1rem;opacity:0.7;margin-top:1rem;">
            It's safe to close this tab now (${isMac ? "Cmd" : "Ctrl"}+W)
          </div>
        `;
      }, 400);
    });
  },

  restart() {
    console.log("[power] Restart requested");
    showPowerScreen("Restarting...", () => {
      location.reload();
    });
  }
};
