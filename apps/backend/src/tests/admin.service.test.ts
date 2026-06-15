import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { encrypt } from "../services/crypto.service.js";

const VALID_KEY = "a".repeat(64);

vi.mock("../lib/prisma.js", () => ({
  default: {
    report: {
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    thread: { findUnique: vi.fn() },
    comment: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    threadImage: { findMany: vi.fn() },
    commentLike: { deleteMany: vi.fn() },
  },
}));

vi.mock("../lib/cloudinary.js", () => ({
  deleteImage: vi.fn(),
}));

import prisma from "../lib/prisma.js";
import { getReports } from "../services/admin.service.js";

const mockFindMany = vi.mocked(prisma.report.findMany);
const mockCount = vi.mocked(prisma.report.count);

beforeEach(() => {
  process.env["CHAT_ENCRYPTION_KEY"] = VALID_KEY;
  vi.clearAllMocks();
});

afterEach(() => {
  delete process.env["CHAT_ENCRYPTION_KEY"];
});

describe("getReports — messages chiffrés", () => {
  it("déchiffre le contenu du message signalé", async () => {
    const plaintext = "Ce message est offensant";
    const ciphertext = encrypt(plaintext);

    mockFindMany.mockResolvedValue([
      {
        id: 1,
        status: "pending",
        reason: "Insultes",
        createdAt: new Date(),
        reporter: { id: 2, name: "Alice", email: "alice@test.com" },
        thread: null,
        comment: null,
        message: {
          id: 10,
          content: ciphertext,
          createdAt: new Date(),
          sender: { id: 3, name: "Bob" },
        },
      },
    ] as any);
    mockCount.mockResolvedValue(1);

    const { reports } = await getReports();

    expect(reports[0]?.message?.content).toBe(plaintext);
  });

  it("laisse passer un message en clair (rétrocompatibilité)", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 2,
        status: "pending",
        reason: null,
        createdAt: new Date(),
        reporter: { id: 2, name: "Alice", email: "alice@test.com" },
        thread: null,
        comment: null,
        message: {
          id: 11,
          content: "Ancien message non chiffré",
          createdAt: new Date(),
          sender: { id: 3, name: "Bob" },
        },
      },
    ] as any);
    mockCount.mockResolvedValue(1);

    const { reports } = await getReports();

    expect(reports[0]?.message?.content).toBe("Ancien message non chiffré");
  });

  it("retourne null pour un signalement sans message (thread/commentaire)", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 3,
        status: "pending",
        reason: "Spam",
        createdAt: new Date(),
        reporter: { id: 2, name: "Alice", email: "alice@test.com" },
        thread: { id: 5, title: "Thread spam", author: { id: 3, name: "Bob" } },
        comment: null,
        message: null,
      },
    ] as any);
    mockCount.mockResolvedValue(1);

    const { reports } = await getReports();

    expect(reports[0]?.message).toBeNull();
  });

  it("retourne null si le message signalé n'a pas de contenu texte", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 4,
        status: "pending",
        reason: "Image choquante",
        createdAt: new Date(),
        reporter: { id: 2, name: "Alice", email: "alice@test.com" },
        thread: null,
        comment: null,
        message: {
          id: 12,
          content: null,
          createdAt: new Date(),
          sender: { id: 3, name: "Bob" },
        },
      },
    ] as any);
    mockCount.mockResolvedValue(1);

    const { reports } = await getReports();

    expect(reports[0]?.message?.content).toBeNull();
  });
});
