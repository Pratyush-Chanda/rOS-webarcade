// rDiskette Manager — User Disk Loader for rOS

console.log("[rDiskette] Preparing user disk manager");

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => startDiskManager());
} else {
  startDiskManager();
}

async function waitForModule(name, timeout = 5000) {
  const start = Date.now();
  while (!ros[name]) {
    if (Date.now() - start > timeout)
      ros.panic(`Kernel module "${name}" timed out — it may have failed to register`);
    await new Promise(r => setTimeout(r, 100));
  }
}

async function startDiskManager() {
  await waitForModule("libarchive");
  await waitForModule("lzma");
  await waitForModule("ini-parser");

  injectStyles();

  const container = document.createElement("div");
  container.id = "rdiskette-loader";
  container.innerHTML = `
    <div class="rd-card" id="rd-card">
      <div class="rd-logo">
        <span class="rd-logo-icon">⬡</span>
        <span class="rd-logo-text">rOS</span>
      </div>
      <h1 class="rd-title">Welcome</h1>
      <p class="rd-subtitle">Load your rDiskette or create a new one to get started</p>
      <div class="rd-actions">
        <label class="rd-btn rd-btn-primary" for="rdi-file">
          <span class="rd-btn-icon">📂</span> Load rDiskette
        </label>
        <input type="file" id="rdi-file" accept=".rdi" style="display:none" />
        <button class="rd-btn rd-btn-secondary" id="create-new">
          <span class="rd-btn-icon">✦</span> Create New
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(container);
  requestAnimationFrame(() => {
    container.classList.add("rd-visible");
    container.querySelector(".rd-card").classList.add("rd-visible");
  });

  document.getElementById("rdi-file").addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;
    showLoading("Mounting rDiskette…");
    try {
      await mountDiskette(file);
      startLoginManager();
    } catch (err) {
      showError("Failed to mount rDiskette", err.message);
    }
  });

  document.getElementById("create-new").addEventListener("click", showCreationForm);
}

function showLoading(text = "Please wait…") {
  document.getElementById("rd-card").innerHTML = `
    <div class="rd-logo">
      <span class="rd-logo-icon">⬡</span>
      <span class="rd-logo-text">rOS</span>
    </div>
    <div class="rd-spinner"></div>
    <p class="rd-loading-text">${text}</p>
  `;
}

function showError(title, detail) {
  document.getElementById("rd-card").innerHTML = `
    <div class="rd-logo">
      <span class="rd-logo-icon">⬡</span>
      <span class="rd-logo-text">rOS</span>
    </div>
    <div class="rd-error-icon">⚠</div>
    <h2 class="rd-title">${title}</h2>
    <p class="rd-subtitle rd-error-detail">${detail}</p>
    <button class="rd-btn rd-btn-secondary" onclick="location.reload()">↩ Restart</button>
  `;
}

function showCreationForm() {
  document.getElementById("rd-card").innerHTML = `
    <div class="rd-logo">
      <span class="rd-logo-icon">⬡</span>
      <span class="rd-logo-text">rOS</span>
    </div>
    <h1 class="rd-title">Create rDiskette</h1>
    <p class="rd-subtitle">Set up your personal disk image</p>

    <div class="rd-form">
      <div class="rd-field">
        <label class="rd-label">Username</label>
        <input class="rd-input" id="f-username" type="text" placeholder="e.g. alice" autocomplete="off" />
      </div>
      <div class="rd-field">
        <label class="rd-label">Password</label>
        <input class="rd-input" id="f-password" type="password" placeholder="Encrypts your .rdi file" />
      </div>

      <details class="rd-details">
        <summary>Desktop settings</summary>
        <div class="rd-field rd-field-row">
          <label class="rd-label">Icon size</label>
          <select class="rd-input rd-select" id="f-iconSize">
            <option value="small">Small</option>
            <option value="medium" selected>Medium</option>
            <option value="large">Large</option>
          </select>
        </div>
        <div class="rd-checkboxes">
          <label class="rd-check"><input type="checkbox" id="f-showTrash" checked /> Show Trash</label>
          <label class="rd-check"><input type="checkbox" id="f-showHome" checked /> Show Home</label>
          <label class="rd-check"><input type="checkbox" id="f-showDocs" checked /> Show Documents</label>
        </div>
        <div class="rd-field">
          <label class="rd-label">Wallpaper</label>
          <input class="rd-input" id="f-wallpaper" type="file" accept="image/*" />
        </div>
      </details>

      <div class="rd-form-actions">
        <button class="rd-btn rd-btn-ghost" id="back-btn">← Back</button>
        <button class="rd-btn rd-btn-primary" id="submit-btn">Create & Save ✦</button>
      </div>
    </div>
  `;

  document.getElementById("back-btn").onclick = () => {
    document.getElementById("rd-card").classList.remove("rd-visible");
    setTimeout(() => {
      document.getElementById("rd-card").remove();
      document.getElementById("rdiskette-loader").innerHTML = "";
      startDiskManager();
    }, 200);
  };

  document.getElementById("submit-btn").onclick = async () => {
    const username = document.getElementById("f-username").value.trim();
    const password = document.getElementById("f-password").value;
    if (!username) { document.getElementById("f-username").focus(); return; }
    if (!password) { document.getElementById("f-password").focus(); return; }

    showLoading("Creating your rDiskette…");

    const userIni  = `username=${username}`;
    const homeIni  = [
      `iconSize=${document.getElementById("f-iconSize").value}`,
      `showTrash=${document.getElementById("f-showTrash").checked ? 1 : 0}`,
      `showHome=${document.getElementById("f-showHome").checked ? 1 : 0}`,
      `showDocs=${document.getElementById("f-showDocs").checked ? 1 : 0}`
    ].join("\n");

    const files = {
      "user.ini":                 new TextEncoder().encode(userIni),
      "Desktop/.home.ini":        new TextEncoder().encode(homeIni),
      "Documents/.placeholder":   new Uint8Array(),
      "Downloads/.placeholder":   new Uint8Array(),
      "Photos/.placeholder":      new Uint8Array(),
      "Videos/.placeholder":      new Uint8Array(),
      ".config/.placeholder":     new Uint8Array()
    };

    try {
      const blob = await ros.libarchive.pack(files, password);
      const file = new Blob([blob], { type: "application/octet-stream" });
      const a    = document.createElement("a");
      a.href     = URL.createObjectURL(file);
      a.download = `${username}.rdi`;
      a.click();

      await mountDiskette(file, password);
      startLoginManager();
    } catch (err) {
      showError("Failed to create rDiskette", err.message);
    }
  };
}

async function mountDiskette(file, knownPassword = null) {
  const arrayBuffer = await file.arrayBuffer();
  const password    = knownPassword ?? prompt("Enter your rDiskette password:");
  const archive     = await ros.libarchive.unpack(arrayBuffer, password);

  if (!archive["user.ini"]) throw new Error("Missing user.ini — invalid rDiskette");

  const userConf = ros["ini-parser"].parse(new TextDecoder().decode(archive["user.ini"]));

  ros.user = {
    name:            userConf.username || "Guest",
    config:          archive,
    desktopSettings: {},
    home: {
      Desktop:   archive["Desktop"]   || {},
      Documents: archive["Documents"] || {},
      Downloads: archive["Downloads"] || {},
      Photos:    archive["Photos"]    || {},
      Videos:    archive["Videos"]    || {},
      Config:    archive[".config"]   || {}
    }
  };

  if (archive["Desktop/.home.ini"]) {
    ros.user.desktopSettings = ros["ini-parser"].parse(
      new TextDecoder().decode(archive["Desktop/.home.ini"])
    );
  }

  console.log("[rDiskette] Mounted for user:", ros.user.name);
}

function startLoginManager() {
  const loader = document.getElementById("rdiskette-loader");
  loader.style.transition = "opacity 0.4s ease";
  loader.style.opacity    = "0";
  setTimeout(() => {
    loader.remove();
    dispatchEvent(new Event("ros:ui:start"));
  }, 450);
}

function injectStyles() {
  const s = document.createElement("style");
  s.textContent = `
    #rdiskette-loader {
      position: fixed; inset: 0; z-index: 500;
      display: flex; align-items: center; justify-content: center;
      background: #0d0d0f;
      font-family: "Segoe UI", system-ui, sans-serif;
      opacity: 0; transition: opacity 0.4s ease;
    }
    #rdiskette-loader.rd-visible { opacity: 1; }

    .rd-card {
      background: #18181c;
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 16px;
      padding: 40px 48px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.6);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      opacity: 0;
      transform: translateY(12px);
      transition: opacity 0.4s ease, transform 0.4s ease;
    }
    .rd-card.rd-visible { opacity: 1; transform: translateY(0); }

    .rd-logo {
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 8px;
    }
    .rd-logo-icon { font-size: 1.8rem; color: #7c6dfa; }
    .rd-logo-text {
      font-size: 1.4rem; font-weight: 700; letter-spacing: 0.06em;
      color: #fff;
    }

    .rd-title {
      font-size: 1.5rem; font-weight: 600; color: #fff;
      margin: 0; text-align: center;
    }
    .rd-subtitle {
      font-size: 0.875rem; color: #888; margin: 0;
      text-align: center; line-height: 1.5;
    }

    .rd-actions {
      display: flex; flex-direction: column;
      gap: 10px; width: 100%; margin-top: 8px;
    }

    .rd-btn {
      display: flex; align-items: center; justify-content: center;
      gap: 8px; padding: 11px 20px; border-radius: 8px;
      font-size: 0.9rem; font-weight: 500; cursor: pointer;
      border: none; transition: all 0.15s ease; width: 100%;
      text-align: center; text-decoration: none;
    }
    .rd-btn-primary {
      background: #7c6dfa; color: #fff;
    }
    .rd-btn-primary:hover { background: #6a5de8; transform: translateY(-1px); }
    .rd-btn-secondary {
      background: rgba(255,255,255,0.06); color: #ccc;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .rd-btn-secondary:hover { background: rgba(255,255,255,0.1); }
    .rd-btn-ghost {
      background: transparent; color: #888;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .rd-btn-ghost:hover { background: rgba(255,255,255,0.05); color: #ccc; }

    .rd-spinner {
      width: 36px; height: 36px; margin: 16px auto;
      border: 3px solid rgba(255,255,255,0.1);
      border-top-color: #7c6dfa;
      border-radius: 50%;
      animation: rd-spin 0.8s linear infinite;
    }
    @keyframes rd-spin { to { transform: rotate(360deg); } }
    .rd-loading-text { color: #888; font-size: 0.875rem; margin: 0; }

    .rd-error-icon { font-size: 2rem; margin: 8px 0; }
    .rd-error-detail { color: #e07070 !important; }

    .rd-form { width: 100%; display: flex; flex-direction: column; gap: 14px; }
    .rd-field { display: flex; flex-direction: column; gap: 5px; width: 100%; }
    .rd-field-row { flex-direction: row; align-items: center; justify-content: space-between; }
    .rd-label { font-size: 0.8rem; color: #888; }
    .rd-input {
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 7px; padding: 9px 12px; color: #fff;
      font-size: 0.875rem; outline: none; width: 100%; box-sizing: border-box;
      transition: border-color 0.15s ease;
    }
    .rd-input:focus { border-color: #7c6dfa; }
    .rd-select { width: auto; }

    .rd-details {
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
      border-radius: 8px; padding: 10px 14px; width: 100%; box-sizing: border-box;
    }
    .rd-details summary {
      font-size: 0.8rem; color: #888; cursor: pointer; list-style: none;
    }
    .rd-details summary::-webkit-details-marker { display: none; }
    .rd-details[open] summary { margin-bottom: 10px; }
    .rd-checkboxes {
      display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;
    }
    .rd-check {
      font-size: 0.8rem; color: #aaa; display: flex; align-items: center; gap: 5px;
      cursor: pointer;
    }

    .rd-form-actions {
      display: flex; gap: 10px; margin-top: 4px;
    }
    .rd-form-actions .rd-btn { flex: 1; }
  `;
  document.head.appendChild(s);
}
