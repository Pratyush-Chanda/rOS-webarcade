// libarchive.js — Universal Archive Support for rOS
// Supports: zip, tar, gz, xz, 7z (via jszip, lzma.js, 7z.js)

console.log("[libarchive] Initializing universal archive module...");



function detectFormat(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0x50 && bytes[1] === 0x4B) return "zip"; // PK
  if (bytes[0] === 0x1F && bytes[1] === 0x8B) return "gz";  // GZIP
  if (bytes[0] === 0xFD && bytes[1] === 0x37 && bytes[2] === 0x7A) return "xz"; // XZ
  if (bytes[0] === 0x37 && bytes[1] === 0x7A && bytes[2] === 0xBC) return "7z"; // 7z
  if (bytes[257] === 0x75 && bytes[258] === 0x73 && bytes[259] === 0x74) return "tar"; // ustar
  return "unknown";
}

function parseTarSize(bytes) {
  // POSIX tar stores size as octal ASCII, but GNU tar switches to a
  // base-256 encoding (top bit of the first byte set) for large files.
  if (bytes[0] & 0x80) {
    let size = 0n;
    for (let i = 1; i < bytes.length; i++) size = (size << 8n) | BigInt(bytes[i]);
    return Number(size);
  }
  const str = new TextDecoder().decode(bytes).replace(/\0.*/, "").trim();
  return str ? parseInt(str, 8) : 0;
}

function parseTar(buffer) {
  const files = {};
  const bytes = new Uint8Array(buffer);
  let offset = 0;
  // Two consecutive 512-byte zero blocks mark the end of the archive.
  while (offset + 512 <= bytes.length) {
    const header = bytes.subarray(offset, offset + 512);
    if (header.every(b => b === 0)) break;

    const name = new TextDecoder().decode(header.subarray(0, 100)).replace(/\0.*/, "");
    const size = parseTarSize(header.subarray(124, 136));
    if (!name) break;

    const start = offset + 512;
    files[name] = bytes.slice(start, start + size);
    offset = start + Math.ceil(size / 512) * 512;
  }
  return files;
}

// NOTE: archive-level password options used to be accepted here and handed
// straight to JSZip's generateAsync/loadAsync. Stock JSZip has no built-in
// encryption support, so that option was a silent no-op — files were never
// actually protected. Encryption now lives one layer up, in crypto.js
// (real AES-GCM over the whole packed buffer), so this module only ever
// deals with plain archive bytes.
ros.libarchive = {
  async unpack(buffer) {
    const format = detectFormat(buffer);
    let files = {};

    switch (format) {
      case "zip": {
        const zip = new JSZip();
        const archive = await zip.loadAsync(buffer);
        for (const path in archive.files) {
          if (archive.files[path].dir) continue;
          files[path] = await archive.files[path].async("uint8array");
        }
        break;
      }
      case "gz": {
        if (!ros.lzma) throw new Error("lzma module not loaded");
        const raw = await ros.lzma.decompressGzip(buffer);
        files = parseTar(raw);
        break;
      }
      case "xz": {
        if (!ros.lzma) throw new Error("lzma module not loaded");
        const raw = await ros.lzma.decompress(buffer);
        files = parseTar(raw);
        break;
      }
      case "7z": {
        if (!ros["7z"] || !ros["7z"].extract) {
          throw new Error("7z.js module not loaded or unsupported");
        }
        const extracted = await ros["7z"].extract(buffer);
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

  async pack(files = {}) {
    const zip = new JSZip();
    for (const path in files) zip.file(path, files[path]);
    return await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: { level: 9 }
    });
  }
};

console.log("[libarchive] Universal archive support ready");
