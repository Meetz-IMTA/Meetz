import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encrypt, decrypt, isEncrypted } from "../services/crypto.service.js";

const VALID_KEY = "a".repeat(64); // 32 bytes en hex valide pour les tests

beforeEach(() => {
  process.env["CHAT_ENCRYPTION_KEY"] = VALID_KEY;
});

afterEach(() => {
  delete process.env["CHAT_ENCRYPTION_KEY"];
});

describe("encrypt / decrypt", () => {
  it("retrouve le texte original après chiffrement", () => {
    const original = "Bonjour, comment ça va ?";
    expect(decrypt(encrypt(original))).toBe(original);
  });

  it("produit un ciphertext différent à chaque appel (IV aléatoire)", () => {
    const text = "même message";
    expect(encrypt(text)).not.toBe(encrypt(text));
  });

  it("chiffre les caractères spéciaux et emojis", () => {
    const original = "Test 🔐 <script>alert('xss')</script> & accents éàü";
    expect(decrypt(encrypt(original))).toBe(original);
  });

  it("détecte la falsification du ciphertext (auth tag GCM)", () => {
    const ciphertext = encrypt("message secret");
    const tampered = ciphertext.slice(0, -4) + "0000";
    expect(() => decrypt(tampered)).toThrow();
  });
});

describe("isEncrypted", () => {
  it("reconnaît un message chiffré", () => {
    expect(isEncrypted(encrypt("test"))).toBe(true);
  });

  it("rejette un message en clair", () => {
    expect(isEncrypted("Bonjour tout le monde")).toBe(false);
  });

  it("rejette une chaîne avec deux-points mais pas au bon format", () => {
    expect(isEncrypted("http://exemple.com/path:query")).toBe(false);
  });

  it("rejette une chaîne vide", () => {
    expect(isEncrypted("")).toBe(false);
  });
});

describe("gestion des erreurs", () => {
  it("lève une erreur si CHAT_ENCRYPTION_KEY est absente", () => {
    delete process.env["CHAT_ENCRYPTION_KEY"];
    expect(() => encrypt("test")).toThrow("CHAT_ENCRYPTION_KEY");
  });

  it("lève une erreur si CHAT_ENCRYPTION_KEY est trop courte", () => {
    process.env["CHAT_ENCRYPTION_KEY"] = "abc123";
    expect(() => encrypt("test")).toThrow("CHAT_ENCRYPTION_KEY");
  });
});
