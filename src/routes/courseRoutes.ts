import express from "express";
import {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  addLesson,
  updateLesson,
  deleteLesson,
  addContent,
  updateContent,
  deleteContent,
  reorderContent,
  reorderLessons,
} from "../controllers/courseController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.route("/").get(getCourses).post(protect, createCourse);

router
  .route("/:id")
  .get(getCourseById)
  .put(protect, updateCourse)
  .delete(protect, deleteCourse);

router.route("/:id/lessons").post(protect, addLesson);
router.route("/:id/lessons/reorder").put(protect, reorderLessons);
router.route("/:id/lessons/:lessonId").put(protect, updateLesson).delete(protect, deleteLesson);
router.route("/:id/lessons/:lessonId/content").post(protect, addContent);
router.route("/:id/lessons/:lessonId/content/reorder").put(protect, reorderContent);
router.route("/:id/lessons/:lessonId/content/:contentId").put(protect, updateContent).delete(protect, deleteContent);

export default router;
