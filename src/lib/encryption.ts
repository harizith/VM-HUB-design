import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default_secret_key_32_bytes_long"; // Must be 32 bytes
const IV_LENGTH = 16; // For AES, this is always 16

export function encrypt(text: string) {
  if (!text) return text;
  // If it's already encrypted (starts with IV hex format) or is a bcrypt hash, avoid double encrypting
  if (text.startsWith("$2a$") || text.startsWith("$2b$") || text.includes(":")) return text;

  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
  } catch (e) {
    console.error("Encryption error", e);
    return text;
  }
}

export function decrypt(text: string) {
  if (!text) return text;
  // If it's a bcrypt hash, we cannot decrypt it
  if (text.startsWith("$2a$") || text.startsWith("$2b$")) {
    return "[Cannot decrypt - old bcrypt hash]";
  }
  // If it doesn't contain the IV separator, assume it's just plaintext (like a fallback)
  if (!text.includes(":")) {
    return text;
  }

  try {
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift()!, "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    console.error("Decryption error", e);
    return text; // Return original on failure (maybe it was plaintext that happened to have a colon)
  }
}
