// jszip.js — JSZip integration for ZIP archive operations

console.log("[jszip] Initializing module...");

// Load JSZip from CDN or local copy
await (async () => {
  if (!window.JSZip) {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
      script.onload = resolve;
      script.onerror = () => reject(new Error("Failed to load JSZip"));
      document.head.appendChild(script);
    });
  }
  if (!window.JSZip) {
    throw new Error("JSZip is not available");
  }
})().then(() => {
  console.log("[jszip] JSZip loaded successfully");
}).catch(err => {
  console.error("[jszip] Error loading JSZip:", err);
});

// Expose ZIP extraction via ros.jszip.extract
ros.jszip = {
  /**
   * Extract files from a ZIP archive (as Blob or ArrayBuffer).
   * @param {Blob|ArrayBuffer} data
   * @param {(entry: {path:string, file:Blob}) => void} onEntry
   */
  async extract(data, onEntry) {
    const zip = new JSZip();
    const content = await (data instanceof Blob ? data.arrayBuffer() : data);
    const loaded = await zip.loadAsync(content);
    await Promise.all(Object.keys(loaded.files).map(async path => {
      const fileObj = zip.file(path);
      if (fileObj) {
        const blob = await fileObj.async("blob");
        onEntry({ path, file: blob });
      }
    }));
    console.log("[jszip] Extraction complete:", Object.keys(loaded.files).length, "entries");
  }
};
