import express from "express";
import { register, login, getStudents, deleteStudent, updateStudent, updateProfile } from "../controllers/authController.js";
import { protect, admin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

// Self profile update (authenticated user)
router.put("/profile", protect, updateProfile);

// Student management (admin only)
router.get("/students", protect, admin, getStudents);
router.route("/students/:id").put(protect, admin, updateStudent).delete(protect, admin, deleteStudent);

export default router;
