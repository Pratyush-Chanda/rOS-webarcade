// lzma.js — rOS kernel module wrapper for LZMA decompression
// Provides basic support for decompressing .xz and .gz formats

console.log("[lzma] Initializing module...");



ros.lzma = {
  // Decompress raw LZMA/XZ buffer into a Uint8Array (requires LZMA decoder lib)
  decompress(buffer) {
    if (typeof LZMA === "undefined" || !LZMA.decompress) {
      throw new Error("LZMA decoder not found (LZMA.decompress missing)");
    }
    return LZMA.decompress(new Uint8Array(buffer));
  },

  // Decompress gzip buffer using pako if available
  decompressGzip(buffer) {
    if (typeof pako === "undefined" || !pako.ungzip) {
      throw new Error("Pako (gzip) library not loaded");
    }
    return pako.ungzip(new Uint8Array(buffer));
  }
};
