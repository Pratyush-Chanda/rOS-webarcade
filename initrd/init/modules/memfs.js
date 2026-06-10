// memfs.js: Virtual temp mount point

console.log("[memfs] Module loaded");

ros.memfs = {
  mounts: {},

  mount(name, data) {
    this.mounts[name] = data;
  },

  unmount(name) {
    delete this.mounts[name];
  },

  read(name, path) {
    return this.mounts[name]?.[path] || null;
  },

  list(name) {
    return Object.keys(this.mounts[name] || {});
  }
};
