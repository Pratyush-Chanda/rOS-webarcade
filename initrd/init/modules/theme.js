// theme.js: Apply theme from /etc/theme.json
//
// Previously this only set body background/color/font — theme.json's
// `window`, `panel`, and `dock` sections were parsed into ros.cache but
// nothing ever read them back out, so window_manager.js and panel.js just
// hardcoded their own colors. Now the whole theme is exposed as CSS custom
// properties on :root, and those two modules read from them (with the same
// hardcoded values kept only as the var() fallback).

console.log("[theme] Module loaded");

function applyTheme(theme) {
  const root = document.documentElement.style;
  root.setProperty("--ros-bg",              theme.background        || "#1e1e1e");
  root.setProperty("--ros-fg",              theme.foreground        || "#ffffff");
  root.setProperty("--ros-font",            theme.font              || "sans-serif");
  root.setProperty("--ros-accent",          theme.accent            || "#5294e2");
  root.setProperty("--ros-window-border",   theme.window?.border    || "#444444");
  root.setProperty("--ros-window-bg",       theme.window?.background|| "#222222");
  root.setProperty("--ros-window-titlebar", theme.window?.titlebar  || "#111111");
  root.setProperty("--ros-window-title",    theme.window?.title     || "#ffffff");
  root.setProperty("--ros-window-close",    theme.window?.close     || "#ff5f56");
  root.setProperty("--ros-panel-bg",        theme.panel?.background || "rgba(25, 25, 25, 0.85)");
  root.setProperty("--ros-panel-text",      theme.panel?.text       || "#ffffff");
  root.setProperty("--ros-dock-bg",         theme.dock?.background  || "#252525");
  root.setProperty("--ros-dock-highlight",  theme.dock?.highlight   || "#5294e2");

  const css = document.createElement("style");
  css.textContent = `
    body {
      background: var(--ros-bg);
      color: var(--ros-fg);
      font-family: var(--ros-font);
    }
  `;
  document.head.appendChild(css);
}

fetch("etc/theme.json")
  .then(res => res.json())
  .then(theme => {
    applyTheme(theme);
    ros.cache.setSystem("theme", theme);
  })
  .catch(() => {
    console.warn("Theme load failed — applying defaults");
    applyTheme({}); // fall back to the hardcoded defaults above so CSS vars still exist
  });
