// lzma.js — rOS kernel module wrapper for gzip/xz decompression
//
// Previously this assumed a global `LZMA`/`pako` would already exist, but
// nothing ever loaded those libraries — any .gz/.xz .rdi would throw
// "library not loaded" the instant it was touched. gzip now lazy-loads the
// real pako library from cdnjs on first use, same pattern as jszip.js.
//
// xz/lzma support is left as an explicit "not supported yet" error rather
// than a fake fix: the real LZMA-JS library exposes an async,
// worker/callback-based API (`new LZMA(path); lz.decompress(bytes, cb)`),
// not the synchronous static `LZMA.decompress()` this module used to assume,
// so wiring it up properly needs a worker script path and a callback-to-
// promise wrapper, not just a CDN <script> include.

console.log("[lzma] Initializing module...");

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${url}`));
    document.head.appendChild(script);
  });
}

let pakoLoadPromise = null;
function ensurePako() {
  if (typeof pako !== "undefined") return Promise.resolve();
  pakoLoadPromise ??= loadScript("https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js");
  return pakoLoadPromise;
}

ros.lzma = {
  // xz/.lzma decompression is not implemented yet — see note above.
  async decompress() {
    throw new Error("xz/.lzma decompression isn't supported yet — only .zip and .gz rDiskettes can be mounted");
  },

  // Decompress a gzip buffer into raw bytes using pako (lazy-loaded from CDN).
  async decompressGzip(buffer) {
    await ensurePako().catch(err => {
      throw new Error(`Could not load gzip support: ${err.message}`);
    });
    if (typeof pako === "undefined" || !pako.ungzip) {
      throw new Error("Pako (gzip) library not loaded");
    }
    return pako.ungzip(new Uint8Array(buffer));
  }
};

console.log("[lzma] Ready");
