// shell.js: Basic shell command stub

console.log("[shell] Module loaded");

ros.shell = {
  exec(cmd) {
    switch (cmd) {
      case "help": return "Available: help, ls, clear";
      case "ls": return ros.fs.list().join("\n");
      case "clear": return "__clear";
      default: return `Command not found: ${cmd}`;
    }
  }
};
