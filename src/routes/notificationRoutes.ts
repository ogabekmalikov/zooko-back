import express from "express";
import { protect, admin } from "../middlewares/authMiddleware.js";
import {
  sendNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  getAdminNotifications,
  deleteNotification,
} from "../controllers/notificationController.js";

const router = express.Router();

// User routes
router.get("/", protect, getNotifications);
router.put("/read-all", protect, markAllAsRead);
router.put("/:id/read", protect, markAsRead);

// Admin routes
router.post("/", protect, admin, sendNotification);
router.get("/admin", protect, admin, getAdminNotifications);
router.delete("/:id", protect, admin, deleteNotification);

export default router;
