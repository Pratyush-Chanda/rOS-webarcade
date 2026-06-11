// ini-parser.js — Simple INI config parser for rOS
// Converts INI-style text to JavaScript object and vice versa

console.log("[ini-parser] Module loaded");



ros["ini-parser"] = {
  // Parse INI string into a JS object
  parse(iniText) {
    const result = {};
    const lines = iniText.split(/\r?\n/);
    let section = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith(";")) continue;

      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        section = trimmed.slice(1, -1);
        result[section] = {};
      } else {
        const [key, ...rest] = trimmed.split("=");
        const value = rest.join("=").trim();
        if (section) {
          result[section][key.trim()] = value;
        } else {
          result[key.trim()] = value;
        }
      }
    }

    return result;
  },

  // Convert JS object to INI string
  stringify(obj) {
    let output = "";
    for (const key in obj) {
      if (typeof obj[key] === "object" && obj[key] !== null) {
        output += `\n[${key}]\n`;
        for (const subKey in obj[key]) {
          output += `${subKey}=${obj[key][subKey]}\n`;
        }
      } else {
        output += `${key}=${obj[key]}\n`;
      }
    }
    return output.trim();
  }
};
