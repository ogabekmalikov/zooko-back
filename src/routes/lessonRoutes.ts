import express from "express";
import {
  createLesson,
  getLessons,
  getLessonById,
  updateLesson,
  deleteLesson,
} from "../controllers/lessonController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.route("/").get(getLessons).post(protect, createLesson);

router
  .route("/:id")
  .get(getLessonById)
  .put(protect, updateLesson)
  .delete(protect, deleteLesson);

export default router;
