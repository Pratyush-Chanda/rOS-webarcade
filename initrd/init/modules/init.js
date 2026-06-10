// init.js: Bootstrap the global ros namespace — must load first
console.log("[init] ros namespace initialized");

window.ros = {
  panic(reason) {
    const escaped = String(reason).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    document.body.innerHTML = `
      <div class="crash-screen">
        <h1>Oops! Something crashed</h1>
        <p>Try refreshing to reboot</p>
        <details>
          <summary>Details for debugging:</summary>
          <pre>${escaped}</pre>
        </details>
      </div>
    `;
    const style = document.createElement("style");
    style.textContent = `
      .crash-screen {
        height: 100vh; background: #111; color: #f44;
        font-family: monospace; display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        text-align: center; padding: 2em;
      }
      .crash-screen h1    { font-size: 2em; margin-bottom: 0.5em; }
      .crash-screen p     { font-size: 1em; margin-bottom: 1em; }
      .crash-screen details {
        background: #222; color: #ccc; border: 1px solid #444;
        padding: 1em; max-width: 600px; width: 90%;
        border-radius: 8px; text-align: left;
      }
      .crash-screen details summary { cursor: pointer; font-weight: bold; color: #f66; }
    `;
    document.head.appendChild(style);
    throw new Error(`[kernel panic] ${reason}`);
  }
};
