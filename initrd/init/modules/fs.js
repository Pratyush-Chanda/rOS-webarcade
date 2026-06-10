// fs.js: Virtual filesystem init

console.log("[fs] Module loaded");

ros.fs = {
  files: {},

  write(path, content) {
    this.files[path] = content;
  },

  read(path) {
    return this.files[path] || null;
  },

  exists(path) {
    return Object.hasOwn(this.files, path);
  },

  delete(path) {
    delete this.files[path];
  },

  list() {
    return Object.keys(this.files);
  }
};
