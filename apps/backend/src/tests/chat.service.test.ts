import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { encrypt } from "../services/crypto.service.js";

const VALID_KEY = "a".repeat(64);

vi.mock("../lib/prisma.js", () => ({
  default: {
    message: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    conversationParticipant: {
      findUnique: vi.fn(),
    },
  },
}));

import prisma from "../lib/prisma.js";
import {
  saveMessage,
  getConversationMessages,
  isParticipant,
} from "../services/chat.service.js";

const mockCreate = vi.mocked(prisma.message.create);
const mockFindMany = vi.mocked(prisma.message.findMany);
const mockFindParticipant = vi.mocked(
  prisma.conversationParticipant.findUnique,
);

beforeEach(() => {
  process.env["CHAT_ENCRYPTION_KEY"] = VALID_KEY;
  vi.clearAllMocks();
});

afterEach(() => {
  delete process.env["CHAT_ENCRYPTION_KEY"];
});

describe("saveMessage", () => {
  it("stocke le contenu chiffré en base et retourne le texte en clair", async () => {
    const plaintext = "Bonjour !";

    mockCreate.mockResolvedValue({
      id: 1,
      conversationId: 1,
      senderId: 1,
      content: "valeur_ignorée_saveMessage_utilise_le_plaintext_original",
      imageUrl: null,
      gifUrl: null,
      createdAt: new Date(),
      sender: { id: 1, name: "Alice" },
      reactions: [],
    } as any);

    const result = await saveMessage(1, 1, plaintext);

    const storedContent = mockCreate.mock.calls[0]?.[0]?.data
      ?.content as string;
    expect(storedContent).not.toBe(plaintext);
    expect(storedContent).toMatch(/^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/);
    expect(result.content).toBe(plaintext);
  });

  it("ne chiffre pas si content est vide (message image/gif)", async () => {
    mockCreate.mockResolvedValue({
      id: 2,
      conversationId: 1,
      senderId: 1,
      content: null,
      imageUrl: "https://example.com/img.jpg",
      gifUrl: null,
      createdAt: new Date(),
      sender: { id: 1, name: "Alice" },
      reactions: [],
    } as any);

    const result = await saveMessage(1, 1, "", "https://example.com/img.jpg");

    const storedContent = mockCreate.mock.calls[0]?.[0]?.data?.content;
    expect(storedContent).toBeNull();
    expect(result.content).toBeNull();
  });
});

describe("getConversationMessages", () => {
  it("lève une erreur si l'utilisateur n'est pas participant", async () => {
    mockFindParticipant.mockResolvedValue(null);

    await expect(getConversationMessages(1, 99, 1, 20)).rejects.toThrow(
      "Non autorisé",
    );
  });

  it("déchiffre les messages chiffrés", async () => {
    const plaintext = "Message secret";
    const ciphertext = encrypt(plaintext);

    mockFindParticipant.mockResolvedValue({
      conversationId: 1,
      userId: 1,
    } as any);
    mockFindMany.mockResolvedValue([
      {
        id: 1,
        content: ciphertext,
        imageUrl: null,
        gifUrl: null,
        createdAt: new Date(),
        sender: { id: 2, name: "Bob" },
        reactions: [],
      },
    ] as any);

    const messages = await getConversationMessages(1, 1, 1, 20);

    expect(messages[0]?.content).toBe(plaintext);
  });

  it("laisse passer les messages en clair (rétrocompatibilité)", async () => {
    mockFindParticipant.mockResolvedValue({
      conversationId: 1,
      userId: 1,
    } as any);
    mockFindMany.mockResolvedValue([
      {
        id: 2,
        content: "Ancien message non chiffré",
        imageUrl: null,
        gifUrl: null,
        createdAt: new Date(),
        sender: { id: 2, name: "Bob" },
        reactions: [],
      },
    ] as any);

    const messages = await getConversationMessages(1, 1, 1, 20);

    expect(messages[0]?.content).toBe("Ancien message non chiffré");
  });

  it("retourne null pour les messages sans contenu texte", async () => {
    mockFindParticipant.mockResolvedValue({
      conversationId: 1,
      userId: 1,
    } as any);
    mockFindMany.mockResolvedValue([
      {
        id: 3,
        content: null,
        imageUrl: "https://example.com/img.jpg",
        gifUrl: null,
        createdAt: new Date(),
        sender: { id: 2, name: "Bob" },
        reactions: [],
      },
    ] as any);

    const messages = await getConversationMessages(1, 1, 1, 20);

    expect(messages[0]?.content).toBeNull();
  });
});

describe("isParticipant", () => {
  it("retourne true si l'utilisateur est dans la conversation", async () => {
    mockFindParticipant.mockResolvedValue({
      conversationId: 1,
      userId: 1,
    } as any);
    expect(await isParticipant(1, 1)).toBe(true);
  });

  it("retourne false si l'utilisateur n'est pas dans la conversation", async () => {
    mockFindParticipant.mockResolvedValue(null);
    expect(await isParticipant(1, 99)).toBe(false);
  });
});
