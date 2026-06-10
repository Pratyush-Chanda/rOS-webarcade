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
      ros.proc.addTask({ name, pid: ros.proc.tasks.length });
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
