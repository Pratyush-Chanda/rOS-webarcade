// apps.js: Handle launching apps

console.log("[apps] Module loaded");

ros.apps = {
  registry: {},

  register(name, launchFn) {
    this.registry[name] = launchFn;
  },

  launch(name) {
    const app = this.registry[name];
    if (app) {
      // Was `pid: ros.proc.tasks.length` — fine until any task is ever
      // removed, at which point the length-based id collides/repeats.
      ros.proc.addTask({ name, pid: ros.nanoid ? ros.nanoid(8) : Date.now() });
      app();
    } else {
      console.warn(`App "${name}" not found.`);
    }
  }
};

// Register dummy "Files" app
ros.apps.register("test", () => {
  ros.windows.open({
    title: "Test",
    content: "<p>Test dummy window.</p>"
  });
});

// Real Files app — reuses desktop.js's folder browser (ros.desktop is
// resolved lazily here at launch time, not at registration time, so load
// order between apps.js and desktop.js doesn't matter).
ros.apps.register("files", () => {
  if (ros.desktop?.openHomeWindow) ros.desktop.openHomeWindow();
  else console.warn("[apps] desktop module not available yet");
});
