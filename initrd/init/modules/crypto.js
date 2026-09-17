// crypto.js — Real password-based encryption for rDiskette (.rdi) files
//
// Format written by encrypt():
//   [4 bytes magic "RDI1"][16 bytes salt][12 bytes iv][AES-GCM ciphertext]
//
// Key derivation: PBKDF2-SHA256(password, salt, 210000 iters) -> AES-GCM 256-bit key.
// This replaces the old JSZip `password` option, which stock JSZip silently
// ignores (no encryption plugin is loaded), so files were never actually
// protected even though the UI prompted for and used a password.

console.log("[crypto] Module loaded");

const RDI_MAGIC = new Uint8Array([0x52, 0x44, 0x49, 0x31]); // "RDI1"
const SALT_LEN  = 16;
const IV_LEN    = 12;
const PBKDF2_ITERATIONS = 210000;

function bytesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

ros.crypto = {
  /** True if `buffer` starts with the RDI1 encrypted-archive header. */
  isEncrypted(buffer) {
    const bytes = new Uint8Array(buffer).subarray(0, 4);
    return bytesEqual(bytes, RDI_MAGIC);
  },

  /** Encrypt `data` (Uint8Array) with `password`, returns a Uint8Array. */
  async encrypt(data, password) {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
    const iv   = crypto.getRandomValues(new Uint8Array(IV_LEN));
    const key  = await deriveKey(password, salt);
    const ciphertext = new Uint8Array(
      await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data)
    );

    const out = new Uint8Array(RDI_MAGIC.length + SALT_LEN + IV_LEN + ciphertext.length);
    out.set(RDI_MAGIC, 0);
    out.set(salt, RDI_MAGIC.length);
    out.set(iv, RDI_MAGIC.length + SALT_LEN);
    out.set(ciphertext, RDI_MAGIC.length + SALT_LEN + IV_LEN);
    return out;
  },

  /**
   * Decrypt an RDI1-framed buffer with `password`, returns a Uint8Array.
   * Throws (wrong password / corrupt file) if the AES-GCM tag doesn't verify.
   */
  async decrypt(buffer, password) {
    const bytes = new Uint8Array(buffer);
    if (!this.isEncrypted(bytes)) throw new Error("Not an encrypted rDiskette file");

    const salt = bytes.subarray(RDI_MAGIC.length, RDI_MAGIC.length + SALT_LEN);
    const iv   = bytes.subarray(RDI_MAGIC.length + SALT_LEN, RDI_MAGIC.length + SALT_LEN + IV_LEN);
    const ciphertext = bytes.subarray(RDI_MAGIC.length + SALT_LEN + IV_LEN);

    const key = await deriveKey(password, salt);
    try {
      const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
      return new Uint8Array(plaintext);
    } catch {
      throw new Error("Incorrect password or corrupted rDiskette file");
    }
  }
};

console.log("[crypto] Ready");
