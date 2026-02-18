import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import Group from "../models/groupModel.js";

interface AuthRequest extends Request {
  user?: any;
}

export const register = async (req: Request, res: Response): Promise<any> => {
  try {
    const { firstName, lastName, userName, email, password, role, grade } = req.body;

    if (!firstName || !lastName || !userName || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ userName });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with this username already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      firstName,
      lastName,
      userName,
      email: email || "",
      password: hashedPassword,
      role: role || "user",
      grade: grade || "",
    });

    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "1d" },
    );

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        userName: newUser.userName,
        role: newUser.role,
      },
    });
  } catch (error: any) {
    console.error("Register Error:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

export const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const { userName, password } = req.body;

    if (!userName || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    const user = await User.findOne({ userName });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Update lastLogin
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "1d" },
    );

    // Find the user's group
    const group = await Group.findOne({ students: user._id });

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        userName: user.userName,
        role: user.role,
        grade: user.grade,
        group: group ? { _id: group._id, name: group.name, grade: group.grade } : null,
      },
    });
  } catch (error: any) {
    console.error("Login Error:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// Get all students (admin only)
export const getStudents = async (req: Request, res: Response): Promise<any> => {
  try {
    const filter: any = { role: "user" };
    if (req.query.grade) filter.grade = req.query.grade;
    const students = await User.find(filter).select("-password").sort({ createdAt: -1 });
    res.json(students);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching students", error: error.message });
  }
};

// Delete a student (admin only)
export const deleteStudent = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Student not found" });
    if (user.role === "admin") return res.status(400).json({ message: "Cannot delete admin users" });
    await user.deleteOne();
    res.json({ message: "Student deleted" });
  } catch (error: any) {
    res.status(500).json({ message: "Error deleting student", error: error.message });
  }
};

// Update own profile (authenticated user)
export const updateProfile = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Not authorized" });

    const { firstName, lastName, userName, password, avatar } = req.body;
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (userName) {
      const existing = await User.findOne({ userName, _id: { $ne: user._id } });
      if (existing) return res.status(400).json({ message: "Bu foydalanuvchi nomi band" });
      user.userName = userName;
    }
    if (avatar !== undefined) user.avatar = avatar;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();
    const { password: _, ...userObj } = user.toObject();
    res.json(userObj);
  } catch (error: any) {
    res.status(500).json({ message: "Error updating profile", error: error.message });
  }
};
export const updateStudent = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Student not found" });

    const { firstName, lastName, userName, grade, password } = req.body;
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (userName) user.userName = userName;
    if (grade !== undefined) user.grade = grade;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();
    const { password: _, ...userObj } = user.toObject();
    res.json(userObj);
  } catch (error: any) {
    res.status(500).json({ message: "Error updating student", error: error.message });
  }
};

// Reset student password (admin only)
export const resetStudentPassword = async (req: Request, res: Response): Promise<any> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Student not found" });
    if (user.role === "admin") return res.status(400).json({ message: "Cannot reset admin password" });

    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    let newPassword = "";
    for (let i = 0; i < 8; i++) newPassword += chars[Math.floor(Math.random() * chars.length)];

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ userName: user.userName, password: newPassword });
  } catch (error: any) {
    res.status(500).json({ message: "Error resetting password", error: error.message });
  }
};
export const getMe = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Not authorized" });

    const group = await Group.findOne({ students: user._id });

    res.json({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      userName: user.userName,
      role: user.role,
      grade: user.grade,
      coins: user.coins,
      avatar: user.avatar,
      group: group ? { _id: group._id, name: group.name, grade: group.grade } : null,
    });
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching user", error: error.message });
  }
};
