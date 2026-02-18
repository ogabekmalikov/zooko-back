import { Request, Response } from "express";
import Notification from "../models/notificationModel.js";

interface AuthRequest extends Request {
  user?: any;
}

// POST /api/notifications — admin sends notification
export const sendNotification = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { title, message, type, target, recipients } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: "Sarlavha va xabar kerak" });
    }

    const notification = await Notification.create({
      title,
      message,
      type: type || "info",
      target: target || "all",
      recipients: target === "selected" ? recipients : [],
      sentBy: req.user._id,
    });

    res.status(201).json(notification);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/notifications — user gets their notifications
export const getNotifications = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user._id;

    const notifications = await Notification.find({
      $or: [
        { target: "all" },
        { target: "selected", recipients: userId },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("sentBy", "firstName lastName")
      .lean();

    // Add `read` field per user
    const result = notifications.map((n: any) => ({
      ...n,
      read: n.readBy?.some((id: any) => id.toString() === userId.toString()) || false,
    }));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/notifications/:id/read — mark as read
export const markAsRead = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user._id;

    await Notification.findByIdAndUpdate(req.params.id, {
      $addToSet: { readBy: userId },
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/notifications/read-all — mark all as read
export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user._id;

    await Notification.updateMany(
      {
        $or: [
          { target: "all" },
          { target: "selected", recipients: userId },
        ],
      },
      { $addToSet: { readBy: userId } }
    );

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/notifications/admin — admin gets all sent notifications
export const getAdminNotifications = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("sentBy", "firstName lastName")
      .populate("recipients", "firstName lastName grade")
      .lean();

    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/notifications/:id — admin deletes notification
export const deleteNotification = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
