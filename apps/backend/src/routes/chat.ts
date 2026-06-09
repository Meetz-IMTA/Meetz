import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  listConversations,
  listMessages,
  createPrivateConversation,
  listUsers,
  uploadChatImage,
  chatUpload,
} from "../controllers/chat.controller.js";

const router = Router();

router.use(authMiddleware);

router.get("/conversations", listConversations);
router.get("/conversations/:id/messages", listMessages);
router.post("/conversations/private", createPrivateConversation);
router.get("/users", listUsers);
router.post("/upload", chatUpload.single("image"), uploadChatImage);

export default router;
