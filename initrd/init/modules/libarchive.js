// libarchive.js — Universal Archive Support for rOS
// Supports: zip, tar, gz, xz, 7z (via jszip, lzma.js, 7z.js)

console.log("[libarchive] Initializing universal archive module...");

ros.modules = ros.modules || {};

function detectFormat(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0x50 && bytes[1] === 0x4B) return "zip"; // PK
  if (bytes[0] === 0x1F && bytes[1] === 0x8B) return "gz";  // GZIP
  if (bytes[0] === 0xFD && bytes[1] === 0x37 && bytes[2] === 0x7A) return "xz"; // XZ
  if (bytes[0] === 0x37 && bytes[1] === 0x7A && bytes[2] === 0xBC) return "7z"; // 7z
  if (bytes[257] === 0x75 && bytes[258] === 0x73 && bytes[259] === 0x74) return "tar"; // ustar
  return "unknown";
}

function parseTar(buffer) {
  const files = {};
  const bytes = new Uint8Array(buffer);
  let offset = 0;
  while (offset < bytes.length) {
    const name = new TextDecoder().decode(bytes.subarray(offset, offset + 100)).replace(/\0.*/, "");
    const sizeStr = new TextDecoder().decode(bytes.subarray(offset + 124, offset + 136)).replace(/\0.*/, "");
    const size = parseInt(sizeStr.trim(), 8);
    if (!name) break;
    const start = offset + 512;
    files[name] = bytes.slice(start, start + size);
    offset = start + Math.ceil(size / 512) * 512;
  }
  return files;
}

ros.modules.libarchive = {
  async unpack(buffer, password = "") {
    const format = detectFormat(buffer);
    let files = {};

    switch (format) {
      case "zip": {
        const zip = new JSZip();
        const archive = await zip.loadAsync(buffer, { password });
        for (const path in archive.files) {
          files[path] = await archive.files[path].async("uint8array");
        }
        break;
      }
      case "gz": {
        if (!ros.modules.lzma) throw new Error("lzma module not loaded");
        const raw = ros.modules.lzma.decompressGzip(buffer);
        files = parseTar(raw);
        break;
      }
      case "xz": {
        if (!ros.modules.lzma) throw new Error("lzma module not loaded");
        const raw = ros.modules.lzma.decompress(buffer);
        files = parseTar(raw);
        break;
      }
      case "7z": {
        if (!ros.modules["7z"] || !ros.modules["7z"].extract) {
          throw new Error("7z.js module not loaded or unsupported");
        }
        const extracted = await ros.modules["7z"].extract(buffer);
        for (const entry of extracted) {
          files[entry.name] = entry.buffer;
        }
        break;
      }
      case "tar": {
        files = parseTar(buffer);
        break;
      }
      default:
        throw new Error("Unsupported archive format");
    }

    return files;
  },

  async pack(files = {}, password = "") {
    const zip = new JSZip();
    for (const path in files) zip.file(path, files[path]);
    return await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: { level: 9 },
      password: password || undefined
    });
  }
};

console.log("[libarchive] Universal archive support ready");
