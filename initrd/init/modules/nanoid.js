// nanoid.js: UUID generator

console.log("[nanoid] Module loaded");

ros.nanoid = (() => {
  const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  return (length = 8) =>
    Array.from({ length }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
})();
