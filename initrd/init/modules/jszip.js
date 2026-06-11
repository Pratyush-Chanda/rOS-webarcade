// jszip.js — JSZip integration for ZIP archive operations

console.log("[jszip] Initializing module...");

if (!window.JSZip) {
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Failed to load JSZip from CDN"));
    document.head.appendChild(script);
  }).catch(err => ros.panic(`[jszip] ${err.message}`));
}

ros.jszip = {
  async extract(data, onEntry) {
    const zip     = new JSZip();
    const content = await (data instanceof Blob ? data.arrayBuffer() : data);
    const loaded  = await zip.loadAsync(content);
    await Promise.all(Object.keys(loaded.files).map(async path => {
      const fileObj = zip.file(path);
      if (fileObj) onEntry({ path, file: await fileObj.async("blob") });
    }));
    console.log("[jszip] Extraction complete:", Object.keys(loaded.files).length, "entries");
  }
};

console.log("[jszip] Ready");
