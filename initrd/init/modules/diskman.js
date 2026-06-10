// rDiskette Manager — User Disk Loader for rOS
// Handles mounting or creating .rdi archive files before login

console.log("[rDiskette] Preparing user disk manager");

// Run once DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => startDiskManager());
} else {
  startDiskManager();
}

// Wait until a given kernel module is available
async function waitForModule(name, timeout = 5000) {
  const start = Date.now();
  while (!ros[name]) {
    if (Date.now() - start > timeout) throw new Error(`Module '${name}' not loaded in time`);
    await new Promise(r => setTimeout(r, 100));
  }
}

// Initialize UI and bind file/create actions
async function startDiskManager() {
  // Ensure required modules are loaded before proceeding
  await waitForModule("libarchive");
  await waitForModule("lzma");
  await waitForModule("ini-parser");

  // Build diskette loader UI
  const container = document.createElement("div");
  container.id = "rdiskette-loader";
  container.innerHTML = `
    <div class="rdiskette-wrapper">
      <h2>Welcome to rOS</h2>
      <p>Please load your <strong>.rdi</strong> diskette or create a new one:</p>
      <div class="rdiskette-actions">
        <input type="file" id="rdi-file" accept=".rdi" />
        <button id="create-new">Create New rDiskette</button>
      </div>
    </div>
  `;
  document.body.appendChild(container);
  console.log("[rDiskette] UI container added:", container);

  // Load existing .rdi archive
  document.getElementById("rdi-file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    startLoadingScreen("Welcome");
    try {
      await mountDiskette(file);
      startLoginManager();
    } catch (err) {
      console.error("[rDiskette] Failed to mount:", err);
      ros.crash?.("Failed to mount rDiskette", err);
    }
  });

  // Trigger creation form
  document.getElementById("create-new").addEventListener("click", () => {
    showCreationForm();
  });
}

// Show throbber screen
function startLoadingScreen(text = "Preparing for first use") {
  document.getElementById("rdiskette-loader").innerHTML = `
    <div class="rdiskette-throbber">
      <div class="spinner"></div>
      <p>${text}</p>
    </div>
  `;
}

// Extract an existing .rdi archive into memory and parse config
async function mountDiskette(file) {
  const arrayBuffer = await file.arrayBuffer();
  const password = prompt("Enter archive password (user password):");
  const archive = await ros.libarchive.unpack(arrayBuffer, password);

  if (!archive["user.ini"]) throw new Error("Missing user.ini");

  const userConf = ros["ini-parser"].parse(
    new TextDecoder().decode(archive["user.ini"])
  );

  ros.user = {
    name: userConf.username || "Guest",
    config: archive,
    desktopSettings: {},
    home: {
      Desktop: archive["Desktop"] || {},
      Documents: archive["Documents"] || {},
      Downloads: archive["Downloads"] || {},
      Photos: archive["Photos"] || {},
      Videos: archive["Videos"] || {},
      Config: archive[".config"] || {}
    }
  };

  if (archive["Desktop/.home.ini"]) {
    ros.user.desktopSettings = ros.modules["ini-parser"].parse(
      new TextDecoder().decode(archive["Desktop/.home.ini"])
    );
  }

  console.log("[rDiskette] Disk mounted for user:", ros.user.name);
}

// Display form to configure a new rDiskette image
function showCreationForm() {
  document.getElementById("rdiskette-loader").innerHTML = `
    <form id="create-form" class="rdiskette-create">
      <h3>Create New rDiskette</h3>
      <label>Username: <input name="username" required /></label>
      <label>Password: <input name="password" type="password" required /></label>

      <details>
        <summary>Advanced Desktop Settings</summary>
        <label>Icon Size:
          <select name="iconSize">
            <option value="small">Small</option>
            <option value="medium" selected>Medium</option>
            <option value="large">Large</option>
          </select>
        </label>
        <label><input type="checkbox" name="showTrash" checked /> Show Trash</label>
        <label><input type="checkbox" name="showHome" checked /> Show Home</label>
        <label><input type="checkbox" name="showDocs" checked /> Show Documents</label>
        <label><input type="file" name="wallpaper" accept="image/*" /> Custom Wallpaper</label>
      </details>

      <button type="submit">Create & Save</button>
    </form>
  `;

  document.getElementById("create-form").onsubmit = async (e) => {
    e.preventDefault();
    startLoadingScreen("Preparing for first use");

    const form = new FormData(e.target);
    const password = form.get("password");
    const userIni = `username=${form.get("username")}`;
    const homeIni = `iconSize=${form.get("iconSize")}
showTrash=${form.get("showTrash") ? 1 : 0}
showHome=${form.get("showHome") ? 1 : 0}
showDocs=${form.get("showDocs") ? 1 : 0}`;

    // Create archive file structure
    const files = {
      "user.ini": new TextEncoder().encode(userIni),
      "Desktop/.home.ini": new TextEncoder().encode(homeIni),
      "Documents/.placeholder": new Uint8Array(),
      "Downloads/.placeholder": new Uint8Array(),
      "Photos/.placeholder": new Uint8Array(),
      "Videos/.placeholder": new Uint8Array(),
      ".config/.placeholder": new Uint8Array()
    };

    // Generate archive using libarchive
    const blob = await ros.libarchive.pack(files, password);
    const file = new Blob([blob], { type: "application/octet-stream" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file);
    a.download = `${form.get("username")}.rdi`;
    a.click();

    // Mount disk image after creation
    await mountDiskette(file);
    startLoginManager();
  };
}

// Continue boot to login_manager
function startLoginManager() {
  dispatchEvent(new Event("ros:ui:start"));
}
