import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import authRouter from "./routes/auth.js";
import eventRouter from "./routes/event.js";
import communityRouter from "./routes/community.js";
import notificationRouter from "./routes/notification.js";
import adminRouter from "./routes/admin.js";
import chatRouter from "./routes/chat.js";
import { registerSocketHandlers } from "./socket/socket.handler.js";

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

export const io = new Server(httpServer, {
  cors: { origin: "http://localhost:4200", methods: ["GET", "POST"] },
});

app.use(cors());
app.use(express.json());

app.get("/api/v1", (_req, res) => {
  res.json({ message: "Meetz API" });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/events", eventRouter);
app.use("/api/v1/community", communityRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/chat", chatRouter);

registerSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
