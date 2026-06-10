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
      } else {
        window.close();
        setTimeout(() => alert("Please close the tab manually."), 500);
      }
    });
  },

  restart() {
    console.log("[power] Restart requested");
    showPowerScreen("Restarting...", () => {
      location.reload();
    });
  }
};
