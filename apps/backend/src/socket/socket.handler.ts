import jwt from "jsonwebtoken";
import type { Server } from "socket.io";
import {
  isParticipant,
  saveMessage,
  markAsRead,
} from "../services/chat.service.js";

export function registerSocketHandlers(io: Server): void {
  io.use((socket, next) => {
    const token = socket.handshake.auth["token"] as string | undefined;
    if (!token) return next(new Error("Token manquant"));
    try {
      const payload = jwt.verify(
        token,
        process.env["ACCESS_TOKEN_SECRET"]!,
      ) as { userId: number };
      socket.data["userId"] = payload.userId;
      next();
    } catch {
      next(new Error("Token invalide"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data["userId"] as number;

    socket.join(`user:${userId}`);

    socket.on("join:conversation", async (conversationId: number) => {
      if (await isParticipant(conversationId, userId)) {
        socket.join(`conv:${conversationId}`);
      }
    });

    socket.on("leave:conversation", (conversationId: number) => {
      socket.leave(`conv:${conversationId}`);
    });

    socket.on(
      "message:send",
      async (data: {
        conversationId: number;
        content: string;
        imageUrl?: string;
        gifUrl?: string;
      }) => {
        const content = data.content?.trim() ?? "";
        const imageUrl = data.imageUrl?.trim() || undefined;
        const gifUrl = data.gifUrl?.trim() || undefined;
        if (!content && !imageUrl && !gifUrl) return;
        if (!(await isParticipant(data.conversationId, userId))) return;
        const message = await saveMessage(
          data.conversationId,
          userId,
          content,
          imageUrl,
          gifUrl,
        );
        io.to(`conv:${data.conversationId}`).emit("message:new", message);
      },
    );

    socket.on("message:read", async (conversationId: number) => {
      await markAsRead(conversationId, userId);
    });

    socket.on("typing:start", (conversationId: number) => {
      socket
        .to(`conv:${conversationId}`)
        .emit("typing:start", { userId, conversationId });
    });

    socket.on("typing:stop", (conversationId: number) => {
      socket
        .to(`conv:${conversationId}`)
        .emit("typing:stop", { userId, conversationId });
    });
  });
}
