// theme.js: Apply theme from /etc/theme.json

console.log("[theme] Module loaded");

fetch("/etc/theme.json")
  .then(res => res.json())
  .then(theme => {
    const css = document.createElement("style");
    css.textContent = `
      body {
        background: ${theme.background || "#1e1e1e"};
        color: ${theme.foreground || "#ffffff"};
        font-family: ${theme.font || "sans-serif"};
      }
    `;
    document.head.appendChild(css);
    ros.cache.setSystem("theme", theme);
  })
  .catch(() => console.warn("Theme load failed"));
