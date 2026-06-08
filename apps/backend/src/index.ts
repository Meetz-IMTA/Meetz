import express from "express";
import cors from "cors";
import authRouter from "./routes/auth.js";
import eventRouter from "./routes/event.js";
import communityRouter from "./routes/community.js";
import notificationRouter from "./routes/notification.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/api/v1", (_req, res) => {
  res.json({ message: "Meetz API" });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/events", eventRouter);
app.use("/api/v1/community", communityRouter);
app.use("/api/v1/notifications", notificationRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
