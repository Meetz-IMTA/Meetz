import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = process.env["CHAT_ENCRYPTION_KEY"];
  if (!hex || hex.length !== 64) {
    throw new Error(
      "CHAT_ENCRYPTION_KEY manquante ou invalide (64 hex chars requis)",
    );
  }
  return Buffer.from(hex, "hex");
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(ciphertext: string): string {
  const key = getKey();
  const [ivHex, tagHex, dataHex] = ciphertext.split(":");

  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Format ciphertext invalide");
  }

  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const data = Buffer.from(dataHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });
  decipher.setAuthTag(tag);

  return decipher.update(data).toString("utf8") + decipher.final("utf8");
}

// Détecte le format iv(24):tag(32):data(n) — rétrocompatibilité messages existants
export function isEncrypted(value: string): boolean {
  const parts = value.split(":");
  return (
    parts.length === 3 &&
    /^[0-9a-f]{24}$/.test(parts[0]!) &&
    /^[0-9a-f]{32}$/.test(parts[1]!) &&
    /^[0-9a-f]+$/.test(parts[2]!)
  );
}
