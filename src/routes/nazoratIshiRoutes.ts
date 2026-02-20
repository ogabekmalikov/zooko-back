import express from "express";
import {
  getAllNazoratIshi,
  getNazoratIshi,
  createNazoratIshi,
  updateNazoratIshi,
  deleteNazoratIshi,
  getExamResults,
  getStudentResult,
  manualGrade,
  getExamViolations,
  getMyExams,
  startExam,
  submitExam,
  reportViolation,
  getMyResult,
} from "../controllers/nazoratIshiController.js";
import { protect, admin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Student routes (must be before /:id to avoid conflicts)
router.get("/student/my-exams", protect, getMyExams);
router.post("/student/:id/start", protect, startExam);
router.post("/student/:id/submit", protect, submitExam);
router.post("/student/:id/violation", protect, reportViolation);
router.get("/student/:id/my-result", protect, getMyResult);

// Admin routes
router.get("/results/:resultId", protect, admin, getStudentResult);
router.put("/results/:resultId/grade", protect, admin, manualGrade);
router.route("/").get(protect, admin, getAllNazoratIshi).post(protect, admin, createNazoratIshi);
router.get("/:id/results", protect, admin, getExamResults);
router.get("/:id/violations", protect, admin, getExamViolations);
router.route("/:id").get(protect, admin, getNazoratIshi).put(protect, admin, updateNazoratIshi).delete(protect, admin, deleteNazoratIshi);

export default router;
