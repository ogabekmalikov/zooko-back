import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import Group from "../models/groupModel.js";
import User from "../models/userModel.js";

function generateId(len = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let r = "";
  for (let i = 0; i < len; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return r;
}

function generatePassword() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let r = "";
  for (let i = 0; i < 8; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return r;
}

// Get all groups
export const getGroups = async (req: Request, res: Response): Promise<any> => {
  try {
    const groups = await Group.find()
      .populate("students", "firstName lastName userName grade avatar lastLogin")
      .sort({ createdAt: -1 });
    res.json(groups);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching groups", error: error.message });
  }
};

// Create a group (optionally with new students from names)
export const createGroup = async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, grade, studentNames } = req.body;
    if (!name || !grade) return res.status(400).json({ message: "Name and grade are required" });

    const studentIds: string[] = [];
    const createdCredentials: { firstName: string; lastName: string; userName: string; password: string }[] = [];

    // Create students from names if provided
    if (studentNames && Array.isArray(studentNames) && studentNames.length > 0) {
      const salt = await bcrypt.genSalt(10);

      for (const fullName of studentNames) {
        const trimmed = (fullName as string).trim();
        if (!trimmed) continue;

        const parts = trimmed.split(/\s+/);
        const lastName = parts[0] || trimmed;
        const firstName = parts.slice(1).join(" ") || lastName;

        const id = generateId();
        const userName = `zooko_${grade}_${id}`;
        const password = generatePassword();
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
          firstName,
          lastName,
          userName,
          password: hashedPassword,
          role: "user",
          grade,
        });

        studentIds.push(user._id.toString());
        createdCredentials.push({ firstName, lastName, userName, password });
      }
    }

    const group = await Group.create({ name, grade, students: studentIds });

    const populated = await Group.findById(group._id)
      .populate("students", "firstName lastName userName grade avatar lastLogin");

    res.status(201).json({ group: populated, credentials: createdCredentials });
  } catch (error: any) {
    res.status(500).json({ message: "Error creating group", error: error.message });
  }
};

// Update group (name or grade)
export const updateGroup = async (req: Request, res: Response): Promise<any> => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const { name, grade } = req.body;
    if (name) group.name = name;

    // If grade changed, update all students in this group
    if (grade && grade !== group.grade) {
      group.grade = grade;
      await User.updateMany(
        { _id: { $in: group.students } },
        { $set: { grade } }
      );
    }

    await group.save();

    const populated = await Group.findById(group._id)
      .populate("students", "firstName lastName userName grade avatar lastLogin");
    res.json(populated);
  } catch (error: any) {
    res.status(500).json({ message: "Error updating group", error: error.message });
  }
};

// Delete group
export const deleteGroup = async (req: Request, res: Response): Promise<any> => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });
    await group.deleteOne();
    res.json({ message: "Group deleted" });
  } catch (error: any) {
    res.status(500).json({ message: "Error deleting group", error: error.message });
  }
};

// Add students to group
export const addStudentsToGroup = async (req: Request, res: Response): Promise<any> => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const { studentIds, studentNames } = req.body;
    const idsToAdd: string[] = studentIds && Array.isArray(studentIds) ? [...studentIds] : [];
    const createdCredentials: { firstName: string; lastName: string; userName: string; password: string }[] = [];

    // Create new students from names if provided
    if (studentNames && Array.isArray(studentNames) && studentNames.length > 0) {
      const salt = await bcrypt.genSalt(10);
      for (const fullName of studentNames) {
        const trimmed = (fullName as string).trim();
        if (!trimmed) continue;
        const parts = trimmed.split(/\s+/);
        const lastName = parts[0] || trimmed;
        const firstName = parts.slice(1).join(" ") || lastName;
        const id = generateId();
        const userName = `zooko_${group.grade}_${id}`;
        const password = generatePassword();
        const hashedPassword = await bcrypt.hash(password, salt);
        const user = await User.create({
          firstName, lastName, userName, password: hashedPassword, role: "user", grade: group.grade,
        });
        idsToAdd.push(user._id.toString());
        createdCredentials.push({ firstName, lastName, userName, password });
      }
    }

    if (idsToAdd.length === 0) {
      return res.status(400).json({ message: "studentIds or studentNames required" });
    }

    // Remove these students from any other group first
    await Group.updateMany(
      { _id: { $ne: group._id } },
      { $pull: { students: { $in: idsToAdd } } }
    );

    // Add to this group (avoid duplicates)
    const existing = group.students.map((s: any) => s.toString());
    const toAdd = idsToAdd.filter((id: string) => !existing.includes(id));
    group.students.push(...toAdd as any[]);
    await group.save();

    // Update students' grade to match group and activate them
    await User.updateMany(
      { _id: { $in: idsToAdd } },
      { $set: { grade: group.grade, status: "active" } }
    );

    const populated = await Group.findById(group._id)
      .populate("students", "firstName lastName userName grade avatar lastLogin");
    res.json({ group: populated, credentials: createdCredentials });
  } catch (error: any) {
    res.status(500).json({ message: "Error adding students", error: error.message });
  }
};

// Remove student from group
export const removeStudentFromGroup = async (req: Request, res: Response): Promise<any> => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const { studentId } = req.body;
    group.students = group.students.filter((s: any) => s.toString() !== studentId);
    await group.save();

    const populated = await Group.findById(group._id)
      .populate("students", "firstName lastName userName grade avatar lastLogin");
    res.json(populated);
  } catch (error: any) {
    res.status(500).json({ message: "Error removing student", error: error.message });
  }
};
