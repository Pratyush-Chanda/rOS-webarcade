// desktop.js — the actual desktop surface.
//
// Previously theme.js/diskman.js saved a wallpaper and desktopSettings
// (iconSize, showTrash, showHome, showDocs) but nothing ever rendered any
// of it — logging in just left a bare panel over a black screen, with no
// way to see files or launch anything (ros.apps.registry existed, but
// nothing in the UI ever called ros.apps.launch()).

console.log("[desktop] Module loaded");

const ICON_PX = { small: 40, medium: 56, large: 80 };

const MIME_BY_EXT = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
  gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
  txt: "text/plain", md: "text/plain", ini: "text/plain", json: "application/json"
};

function extOf(name) {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

function guessMime(name) {
  return MIME_BY_EXT[extOf(name)] || "application/octet-stream";
}

function glyphFor(name) {
  const mime = guessMime(name);
  if (mime.startsWith("image/")) return "🖼️";
  if (mime.startsWith("text/") || mime === "application/json") return "📄";
  return "📦";
}

function bytesToBlobUrl(bytes, mime) {
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

function escapeHtml(str) {
  return str.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

function settingsBool(value, fallback) {
  return value === undefined ? fallback : value === "1";
}

// ---- File preview -----------------------------------------------------

function openFilePreview(name, bytes) {
  const mime = guessMime(name);
  let content;
  if (mime.startsWith("image/")) {
    content = `<img src="${bytesToBlobUrl(bytes, mime)}" style="max-width:100%; max-height:100%; display:block; margin:auto;">`;
  } else if (mime.startsWith("text/") || mime === "application/json") {
    const text = escapeHtml(new TextDecoder().decode(bytes));
    content = `<pre style="white-space:pre-wrap; word-break:break-word; margin:0; font-family:monospace; font-size:13px;">${text}</pre>`;
  } else {
    content = `<div style="padding:2em; text-align:center; opacity:0.7;">Can't preview "${escapeHtml(name)}" — unsupported file type.</div>`;
  }
  ros.windows.open({ title: name, width: 480, height: 360, content });
}

// ---- Folder browser -----------------------------------------------------

function openFolderWindow(title, files) {
  const names = Object.keys(files);
  const rows = names.length
    ? names.map(name => `<div class="ros-file-row" data-name="${escapeHtml(name)}">${glyphFor(name)}&nbsp; ${escapeHtml(name)}</div>`).join("")
    : `<div style="opacity:0.6; padding:1em;">This folder is empty.</div>`;

  const win = ros.windows.open({
    title,
    width: 420,
    height: 320,
    content: `<div class="ros-file-list">${rows}</div>`
  });

  win.querySelectorAll(".ros-file-row").forEach(row => {
    row.addEventListener("dblclick", () => {
      const name = row.dataset.name;
      openFilePreview(name, files[name]);
    });
  });
}

function openHomeWindow() {
  const home = ros.user?.home || {};
  const win = ros.windows.open({
    title: "Home",
    width: 320,
    height: 280,
    content: `<div class="ros-file-list">${
      Object.keys(home).map(folder =>
        `<div class="ros-file-row" data-folder="${folder}">📁&nbsp; ${folder}</div>`
      ).join("")
    }</div>`
  });

  win.querySelectorAll(".ros-file-row").forEach(row => {
    row.addEventListener("dblclick", () => {
      const folder = row.dataset.folder;
      openFolderWindow(folder, home[folder] || {});
    });
  });
}

// ---- Wallpaper -----------------------------------------------------

function applyWallpaper() {
  const path = ros.user?.desktopSettings?.wallpaper;
  if (!path || !ros.user.config?.[path]) return;
  const url = bytesToBlobUrl(ros.user.config[path], guessMime(path));
  Object.assign(document.body.style, {
    backgroundImage: `url("${url}")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat"
  });
}

// ---- Desktop icons -----------------------------------------------------

function renderIcons() {
  const settings = ros.user?.desktopSettings || {};
  const iconPx = ICON_PX[settings.iconSize] || ICON_PX.medium;
  const showTrash = settingsBool(settings.showTrash, true);
  const showHome  = settingsBool(settings.showHome,  true);
  const showDocs  = settingsBool(settings.showDocs,  true);

  const layer = document.createElement("div");
  layer.id = "ros-desktop-icons";

  const items = [];
  if (showHome)  items.push({ label: "Home",      glyph: "🏠", onOpen: openHomeWindow });
  if (showDocs)  items.push({ label: "Documents",  glyph: "📁", onOpen: () => openFolderWindow("Documents", ros.user?.home?.Documents || {}) });
  if (showTrash) items.push({ label: "Trash",      glyph: "🗑️", onOpen: () => openFolderWindow("Trash", {}) });

  const desktopFiles = ros.user?.home?.Desktop || {};
  for (const name in desktopFiles) {
    items.push({ label: name, glyph: glyphFor(name), onOpen: () => openFilePreview(name, desktopFiles[name]) });
  }

  for (const item of items) {
    const icon = document.createElement("div");
    icon.className = "ros-icon";
    icon.innerHTML = `<div class="glyph" style="font-size:${iconPx}px;">${item.glyph}</div><div class="label">${escapeHtml(item.label)}</div>`;
    icon.addEventListener("click", e => {
      e.stopPropagation();
      layer.querySelectorAll(".ros-icon.selected").forEach(el => el.classList.remove("selected"));
      icon.classList.add("selected");
    });
    icon.addEventListener("dblclick", item.onOpen);
    layer.appendChild(icon);
  }

  layer.addEventListener("click", () => {
    layer.querySelectorAll(".ros-icon.selected").forEach(el => el.classList.remove("selected"));
  });

  document.body.appendChild(layer);
}

// ---- App dock -----------------------------------------------------

function renderDock() {
  const names = Object.keys(ros.apps?.registry || {});
  if (!names.length) return;

  const dock = document.createElement("div");
  dock.id = "ros-dock";
  for (const name of names) {
    const btn = document.createElement("button");
    btn.className = "ros-dock-item";
    btn.textContent = name;
    btn.title = `Launch ${name}`;
    btn.onclick = () => ros.apps.launch(name);
    dock.appendChild(btn);
  }
  document.body.appendChild(dock);
}

// ---- Styles -----------------------------------------------------

const style = document.createElement("style");
style.textContent = `
#ros-desktop-icons {
  position: fixed;
  inset: 36px 0 0 0; /* leave room for the panel */
  padding: 16px;
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 4px;
  z-index: 1;
}
.ros-icon {
  width: 92px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
  color: var(--ros-fg, white);
  text-shadow: 0 1px 3px rgba(0,0,0,0.8);
}
.ros-icon:hover, .ros-icon.selected { background: rgba(255,255,255,0.15); }
.ros-icon .label { font-size: 12px; text-align: center; word-break: break-word; max-width: 84px; margin-top: 4px; }
.ros-file-list { display: flex; flex-direction: column; }
.ros-file-row {
  padding: 6px 8px;
  border-radius: 4px;
  cursor: default;
  user-select: none;
}
.ros-file-row:hover { background: rgba(255,255,255,0.1); }
#ros-dock {
  position: fixed;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  padding: 8px;
  background: var(--ros-dock-bg, #252525);
  border-radius: 12px;
  z-index: 900;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
}
.ros-dock-item {
  background: transparent;
  border: none;
  color: var(--ros-fg, white);
  padding: 6px 14px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
}
.ros-dock-item:hover { background: var(--ros-dock-highlight, #5294e2); }
`;
document.head.appendChild(style);

// Public API — apps (e.g. apps.js's "files" app) reach back into the
// desktop this way instead of duplicating folder/preview rendering.
ros.desktop = { openHomeWindow, openFolderWindow, openFilePreview, applyWallpaper };

addEventListener("ros:ui:start", () => {
  applyWallpaper();
  renderIcons();
  renderDock();
});
