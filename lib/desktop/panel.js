// panel.js — rOS top system panel
// Lives in /lib/desktop/ — loaded as a userspace component, not a kernel module

console.log("[panel] Module loaded");

addEventListener("ros:ui:start", () => {
  const panel = document.createElement("div");
  panel.id = "top-panel";
  Object.assign(panel.style, {
    position:        "fixed",
    top:             "0",
    left:            "0",
    width:           "100%",
    height:          "36px",
    backgroundColor: "var(--ros-panel-bg, rgba(25, 25, 25, 0.85))",
    backdropFilter:  "blur(10px)",
    display:         "flex",
    justifyContent:  "space-between",
    alignItems:      "center",
    padding:         "0 12px",
    color:           "var(--ros-panel-text, white)",
    fontFamily:      "Segoe UI, sans-serif",
    fontSize:        "14px",
    zIndex:          "1000",
    boxSizing:       "border-box"
  });

  // Taskbar — lists open windows so a minimized one can be brought back.
  // Previously window_manager.js's minBtn just set display:none with no
  // way to un-minimize short of reloading the whole app.
  const taskbar = document.createElement("div");
  taskbar.id = "panel-taskbar";
  Object.assign(taskbar.style, { display: "flex", gap: "6px", alignItems: "center" });
  panel.appendChild(taskbar);

  const taskbarButtons = new Map(); // winId -> button element

  function addTaskbarEntry(id, title) {
    const btn = document.createElement("button");
    btn.textContent = title;
    btn.dataset.winId = id;
    Object.assign(btn.style, {
      background:   "rgba(255,255,255,0.08)",
      border:       "none",
      color:        "var(--ros-panel-text, white)",
      fontSize:     "12px",
      cursor:       "pointer",
      padding:      "4px 10px",
      borderRadius: "4px",
      maxWidth:     "140px",
      overflow:     "hidden",
      textOverflow: "ellipsis",
      whiteSpace:   "nowrap"
    });
    btn.onclick = () => {
      if (btn.dataset.minimized === "1") ros.windows.restore(id);
      else                                ros.windows.focus(id);
    };
    taskbar.appendChild(btn);
    taskbarButtons.set(id, btn);
  }

  ros.events?.on("ros:window:opened", ({ id, title }) => addTaskbarEntry(id, title));
  ros.events?.on("ros:window:closed", ({ id }) => {
    taskbarButtons.get(id)?.remove();
    taskbarButtons.delete(id);
  });
  ros.events?.on("ros:window:minimized", ({ id }) => {
    const btn = taskbarButtons.get(id);
    if (btn) { btn.dataset.minimized = "1"; btn.style.opacity = "0.5"; }
  });
  ros.events?.on("ros:window:restored", ({ id }) => {
    const btn = taskbarButtons.get(id);
    if (btn) { btn.dataset.minimized = "0"; btn.style.opacity = "1"; }
  });

  // Clock (centered)
  const clock = document.createElement("div");
  clock.id = "panel-clock";
  Object.assign(clock.style, {
    position:   "absolute",
    left:       "50%",
    transform:  "translateX(-50%)",
    whiteSpace: "nowrap"
  });
  panel.appendChild(clock);

  const updateClock = () => {
    const now  = new Date();
    const time = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    const date = now.toLocaleDateString(undefined,  { weekday: "short", month: "short", day: "numeric" });
    clock.textContent = `${date}, ${time}`;
  };
  updateClock();
  setInterval(updateClock, 1000);

  // Power button
  const powerBtn = document.createElement("button");
  powerBtn.innerHTML = "⏻";
  powerBtn.title = "Power";
  Object.assign(powerBtn.style, {
    background:   "none",
    border:       "none",
    color:        "var(--ros-panel-text, white)",
    fontSize:     "16px",
    cursor:       "pointer",
    padding:      "4px 6px",
    borderRadius: "4px",
    marginLeft:   "auto"
  });

  // Dropdown
  const menu = document.createElement("div");
  menu.id = "power-menu";
  Object.assign(menu.style, {
    position:      "fixed",
    top:           "40px",
    right:         "12px",
    background:    "var(--ros-window-bg, #222)",
    borderRadius:  "6px",
    overflow:      "hidden",
    boxShadow:     "0 2px 6px rgba(0,0,0,0.5)",
    display:       "none",
    flexDirection: "column",
    zIndex:        "1001"
  });

  ["Restart", "Shutdown"].forEach(action => {
    const item = document.createElement("div");
    item.textContent = action;
    Object.assign(item.style, { padding: "10px 16px", cursor: "pointer", whiteSpace: "nowrap" });
    item.onmouseenter = () => item.style.background = "#333";
    item.onmouseleave = () => item.style.background = "transparent";
    item.onclick = () => {
      menu.style.display = "none";
      if (action === "Shutdown") ros.power.shutdown();
      else                       ros.power.restart();
    };
    menu.appendChild(item);
  });

  powerBtn.onclick = () => {
    menu.style.display = menu.style.display === "flex" ? "none" : "flex";
  };
  document.addEventListener("click", e => {
    if (!menu.contains(e.target) && !powerBtn.contains(e.target)) menu.style.display = "none";
  });

  panel.appendChild(powerBtn);
  document.body.appendChild(panel);
  document.body.appendChild(menu);
});
