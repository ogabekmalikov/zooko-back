import express from "express";
import { register, login, getStudents, deleteStudent, updateStudent, updateProfile, getMe, resetStudentPassword } from "../controllers/authController.js";
import { protect, admin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

// Get current user info
router.get("/me", protect, getMe);

// Self profile update (authenticated user)
router.put("/profile", protect, updateProfile);

// Student management (admin only)
router.get("/students", protect, admin, getStudents);
router.route("/students/:id").put(protect, admin, updateStudent).delete(protect, admin, deleteStudent);
router.post("/students/:id/reset-password", protect, admin, resetStudentPassword);

export default router;
