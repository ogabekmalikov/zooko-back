import express from "express";
import {
  getProgress,
  completeLesson,
  submitQuiz,
  submitInteractive,
  claimDailyLogin,
  getLeaderboard,
  getAdminStats,
} from "../controllers/progressController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/me", protect, getProgress);
router.post("/complete-lesson", protect, completeLesson);
router.post("/submit-quiz", protect, submitQuiz);
router.post("/submit-interactive", protect, submitInteractive);
router.post("/daily-login", protect, claimDailyLogin);
router.get("/leaderboard", protect, getLeaderboard);
router.get("/admin-stats", protect, getAdminStats);

export default router;
