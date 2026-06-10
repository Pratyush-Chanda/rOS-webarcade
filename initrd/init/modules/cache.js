// cache.js: In-memory cache store

console.log("[cache] Module loaded");

ros.cache = {
  app: {},
  system: {},

  setApp(key, val) {
    this.app[key] = val;
  },

  getApp(key) {
    return this.app[key];
  },

  setSystem(key, val) {
    this.system[key] = val;
  },

  getSystem(key) {
    return this.system[key];
  }
};
