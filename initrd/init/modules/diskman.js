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
    <div class="rd-bloom rd-bloom-1"></div>
    <div class="rd-bloom rd-bloom-2"></div>
    <div class="rd-bloom rd-bloom-3"></div>
    <div class="rd-bloom rd-bloom-4"></div>

    <div class="rd-card" id="rd-card">
      <div class="rd-wordmark">rOS</div>
      <h1 class="rd-heading">Welcome</h1>
      <p class="rd-body">Load your rDiskette or create a new one to continue.</p>
      <div class="rd-actions">
        <label class="rd-btn rd-btn-primary" for="rdi-file">Load rDiskette</label>
        <input type="file" id="rdi-file" accept=".rdi" style="display:none" />
        <button class="rd-btn rd-btn-outlined" id="create-new">Create New</button>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  document.getElementById("rdi-file").addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;
    showLoading("Mounting rDiskette");
    try {
      await mountDiskette(file);
      startLoginManager();
    } catch (err) {
      showError("Mount failed", err.message);
    }
  });

  document.getElementById("create-new").addEventListener("click", showCreationForm);
}

function showLoading(text = "Please wait") {
  document.getElementById("rd-card").innerHTML = `
    <div class="rd-wordmark">rOS</div>
    <div class="rd-spinner"></div>
    <p class="rd-body">${text}</p>
  `;
}

function showError(title, detail) {
  document.getElementById("rd-card").innerHTML = `
    <div class="rd-wordmark">rOS</div>
    <h1 class="rd-heading">${title}</h1>
    <p class="rd-body rd-error-text">${detail}</p>
    <button class="rd-btn rd-btn-outlined" onclick="location.reload()">Restart</button>
  `;
}

function showCreationForm() {
  document.getElementById("rd-card").innerHTML = `
    <div class="rd-wordmark">rOS</div>
    <h1 class="rd-heading">Create rDiskette</h1>
    <p class="rd-body">Set up your personal disk image.</p>

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
        <summary class="rd-details-summary">Desktop settings</summary>
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

      <div class="rd-form-footer">
        <button class="rd-btn rd-btn-ghost" id="back-btn">Back</button>
        <button class="rd-btn rd-btn-primary" id="submit-btn">Create and save</button>
      </div>
    </div>
  `;

  document.getElementById("back-btn").onclick = () => {
    document.getElementById("rdiskette-loader").remove();
    startDiskManager();
  };

  document.getElementById("submit-btn").onclick = async () => {
    const username = document.getElementById("f-username").value.trim();
    const password = document.getElementById("f-password").value;
    if (!username) { document.getElementById("f-username").focus(); return; }
    if (!password) { document.getElementById("f-password").focus(); return; }

    showLoading("Creating your rDiskette");

    const userIni = `username=${username}`;
    const homeIni = [
      `iconSize=${document.getElementById("f-iconSize").value}`,
      `showTrash=${document.getElementById("f-showTrash").checked ? 1 : 0}`,
      `showHome=${document.getElementById("f-showHome").checked ? 1 : 0}`,
      `showDocs=${document.getElementById("f-showDocs").checked ? 1 : 0}`
    ].join("\n");

    const files = {
      "user.ini":               new TextEncoder().encode(userIni),
      "Desktop/.home.ini":      new TextEncoder().encode(homeIni),
      "Documents/.placeholder": new Uint8Array(),
      "Downloads/.placeholder": new Uint8Array(),
      "Photos/.placeholder":    new Uint8Array(),
      "Videos/.placeholder":    new Uint8Array(),
      ".config/.placeholder":   new Uint8Array()
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
      showError("Creation failed", err.message);
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
  loader.style.animation = "rd-fade-out 0.4s ease forwards";
  setTimeout(() => {
    loader.remove();
    dispatchEvent(new Event("ros:ui:start"));
  }, 420);
}

function injectStyles() {
  const s = document.createElement("style");
  s.textContent = `
    /* ── Container ───────────────────────────── */
    #rdiskette-loader {
      position: fixed; inset: 0; z-index: 500;
      display: flex; align-items: center; justify-content: center;
      background: #06060a;
      font-family: "Segoe UI", system-ui, sans-serif;
      overflow: hidden;
      animation: rd-fade-in 0.5s ease forwards;
    }

    @keyframes rd-fade-in  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes rd-fade-out { from { opacity: 1; } to { opacity: 0; } }

    /* ── Bloom lights ─────────────────────────── */
    .rd-bloom {
      position: absolute;
      border-radius: 50%;
      filter: blur(90px);
      pointer-events: none;
    }
    .rd-bloom-1 {
      width: 600px; height: 600px;
      background: radial-gradient(circle, rgba(66,133,244,0.22) 0%, transparent 70%);
      top: -10%; left: -5%;
      animation: rd-float-1 12s ease-in-out infinite;
    }
    .rd-bloom-2 {
      width: 500px; height: 500px;
      background: radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%);
      bottom: -5%; right: 5%;
      animation: rd-float-2 15s ease-in-out infinite;
    }
    .rd-bloom-3 {
      width: 400px; height: 400px;
      background: radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%);
      top: 40%; right: 20%;
      animation: rd-float-3 10s ease-in-out infinite;
    }
    .rd-bloom-4 {
      width: 350px; height: 350px;
      background: radial-gradient(circle, rgba(234,67,53,0.08) 0%, transparent 70%);
      bottom: 20%; left: 25%;
      animation: rd-float-4 18s ease-in-out infinite;
    }

    @keyframes rd-float-1 {
      0%,100% { transform: translate(0,    0)    scale(1);    }
      33%      { transform: translate(40px, 60px) scale(1.08); }
      66%      { transform: translate(20px,-30px) scale(0.96); }
    }
    @keyframes rd-float-2 {
      0%,100% { transform: translate(0,    0)    scale(1);    }
      40%      { transform: translate(-50px,30px) scale(1.1);  }
      70%      { transform: translate(20px, 50px) scale(0.94); }
    }
    @keyframes rd-float-3 {
      0%,100% { transform: translate(0,    0)    scale(1);    }
      50%      { transform: translate(-30px,40px) scale(1.12); }
    }
    @keyframes rd-float-4 {
      0%,100% { transform: translate(0,    0);    }
      60%      { transform: translate(60px,-20px); }
    }

    /* ── Card ─────────────────────────────────── */
    .rd-card {
      position: relative; z-index: 1;
      background: rgba(18,18,26,0.75);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 28px;
      padding: 48px 52px;
      width: 100%; max-width: 400px;
      display: flex; flex-direction: column; align-items: center;
      gap: 10px;
      box-shadow: 0 32px 80px rgba(0,0,0,0.5);
      animation: rd-card-in 0.6s cubic-bezier(0.16,1,0.3,1) forwards;
    }

    @keyframes rd-card-in {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0);    }
    }

    /* ── Typography ───────────────────────────── */
    .rd-wordmark {
      font-size: 0.75rem; font-weight: 700; letter-spacing: 0.18em;
      color: rgba(255,255,255,0.35); text-transform: uppercase;
      margin-bottom: 4px;
    }
    .rd-heading {
      font-size: 2rem; font-weight: 600; color: #fff;
      margin: 0; text-align: center; letter-spacing: -0.02em;
    }
    .rd-body {
      font-size: 0.875rem; color: rgba(255,255,255,0.5);
      margin: 0; text-align: center; line-height: 1.6;
    }
    .rd-error-text { color: #f28b82; }

    /* ── Buttons ──────────────────────────────── */
    .rd-actions {
      display: flex; flex-direction: column;
      gap: 10px; width: 100%; margin-top: 14px;
    }
    .rd-btn {
      display: flex; align-items: center; justify-content: center;
      padding: 13px 20px; border-radius: 50px;
      font-size: 0.875rem; font-weight: 500; cursor: pointer;
      border: none; transition: all 0.18s ease;
      width: 100%; box-sizing: border-box;
      letter-spacing: 0.01em;
    }
    .rd-btn-primary {
      background: #4285f4; color: #fff;
    }
    .rd-btn-primary:hover {
      background: #3367d6;
      box-shadow: 0 4px 16px rgba(66,133,244,0.35);
      transform: translateY(-1px);
    }
    .rd-btn-outlined {
      background: transparent; color: rgba(255,255,255,0.7);
      border: 1px solid rgba(255,255,255,0.15);
    }
    .rd-btn-outlined:hover {
      background: rgba(255,255,255,0.06);
      border-color: rgba(255,255,255,0.25);
    }
    .rd-btn-ghost {
      background: transparent; color: rgba(255,255,255,0.4);
      border: none; padding: 10px 16px; width: auto;
    }
    .rd-btn-ghost:hover { color: rgba(255,255,255,0.7); }

    /* ── Spinner ──────────────────────────────── */
    .rd-spinner {
      width: 32px; height: 32px; margin: 12px auto;
      border: 2.5px solid rgba(255,255,255,0.1);
      border-top-color: #4285f4;
      border-radius: 50%;
      animation: rd-spin 0.75s linear infinite;
    }
    @keyframes rd-spin { to { transform: rotate(360deg); } }

    /* ── Form ─────────────────────────────────── */
    .rd-form { width: 100%; display: flex; flex-direction: column; gap: 14px; margin-top: 6px; }
    .rd-field { display: flex; flex-direction: column; gap: 5px; }
    .rd-field-row { flex-direction: row; align-items: center; justify-content: space-between; }
    .rd-label { font-size: 0.75rem; color: rgba(255,255,255,0.4); letter-spacing: 0.04em; }
    .rd-input {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      padding: 10px 14px; color: #fff;
      font-size: 0.875rem; outline: none;
      width: 100%; box-sizing: border-box;
      transition: border-color 0.15s ease;
    }
    .rd-input:focus { border-color: #4285f4; }
    .rd-select { width: auto; padding: 6px 10px; }

    .rd-details {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 12px;
      padding: 12px 16px;
    }
    .rd-details-summary {
      font-size: 0.8rem; color: rgba(255,255,255,0.4);
      cursor: pointer; list-style: none;
    }
    .rd-details-summary::-webkit-details-marker { display: none; }
    .rd-details[open] .rd-details-summary { margin-bottom: 12px; }
    .rd-checkboxes { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }
    .rd-check {
      font-size: 0.8rem; color: rgba(255,255,255,0.5);
      display: flex; align-items: center; gap: 5px; cursor: pointer;
    }

    .rd-form-footer {
      display: flex; align-items: center; justify-content: space-between;
      margin-top: 4px;
    }
    .rd-form-footer .rd-btn-primary { width: auto; padding: 13px 28px; }
  `;
  document.head.appendChild(s);
}
