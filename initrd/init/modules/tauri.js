// tauri.js: Tauri desktop integration (gracefully degrades in browser)

console.log("[tauri] Module loaded");

ros.tauri = {
  available: false,

  async init() {
    try {
      if (!window.__TAURI__) throw new Error("Tauri not detected");

      const { appWindow } = window.__TAURI__.window;
      const { exit }      = window.__TAURI__.process;

      Object.assign(this, {
        available:       true,
        close:           () => appWindow.close(),
        minimize:        () => appWindow.minimize(),
        maximize:        () => appWindow.maximize(),
        unmaximize:      () => appWindow.unmaximize(),
        toggleMaximize:  async () => (await appWindow.isMaximized()) ? appWindow.unmaximize() : appWindow.maximize(),
        show:            () => appWindow.show(),
        hide:            () => appWindow.hide(),
        exitApp:         () => exit(0),
      });

      console.log("[tauri] Tauri API available");
    } catch (err) {
      console.warn("[tauri] Not in Tauri environment:", err.message);
    }
  }
};

ros.tauri.init();
