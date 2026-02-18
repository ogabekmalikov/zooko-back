import express from "express";
import {
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  addStudentsToGroup,
  removeStudentFromGroup,
} from "../controllers/groupController.js";
import { protect, admin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.route("/").get(protect, admin, getGroups).post(protect, admin, createGroup);
router.route("/:id").put(protect, admin, updateGroup).delete(protect, admin, deleteGroup);
router.post("/:id/students", protect, admin, addStudentsToGroup);
router.post("/:id/remove-student", protect, admin, removeStudentFromGroup);

export default router;
