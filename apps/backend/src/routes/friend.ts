import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  getFriends,
  getRequests,
  sendRequest,
  acceptRequest,
  declineRequest,
  cancelRequest,
  removeFriend,
} from "../controllers/friend.controller.js";

const router = Router();
router.use(authMiddleware);

router.get("/", getFriends);
router.get("/requests", getRequests);
router.post("/request/:userId", sendRequest);
router.patch("/request/:requestId/accept", acceptRequest);
router.patch("/request/:requestId/decline", declineRequest);
router.delete("/request/:requestId", cancelRequest);
router.delete("/:userId", removeFriend);

export default router;
