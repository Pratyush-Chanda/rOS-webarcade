// proc.js: Simulated runtime proc info

console.log("[proc] Module loaded");

ros.proc = {
  uptime: 0,
  start: Date.now(),
  tasks: [],

  addTask(task) {
    this.tasks.push(task);
  },

  listTasks() {
    return this.tasks;
  },

  update() {
    this.uptime = Math.floor((Date.now() - this.start) / 1000);
  }
};

setInterval(() => ros.proc.update(), 1000);
