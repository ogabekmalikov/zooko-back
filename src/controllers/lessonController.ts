import { Request, Response } from "express";
import Lesson from "../models/lessonModel.js";

interface AuthRequest extends Request {
  user?: any;
}

export const createLesson = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const { title, topic, content, attachments, grade, order } = req.body;

    const lesson = new Lesson({
      title,
      topic,
      content,
      attachments: attachments || [],
      grade,
      order: order || 0,
      createdBy: req.user._id,
    });

    const created = await lesson.save();
    const populated = await created.populate("createdBy", "firstName lastName");
    res.status(201).json(populated);
  } catch (error: any) {
    res.status(500).json({ message: "Error creating lesson", error: error.message });
  }
};

export const getLessons = async (req: Request, res: Response): Promise<any> => {
  try {
    const { grade, topic } = req.query;

    const filter: any = {};
    if (grade && grade !== "all") filter.grade = grade;
    if (topic) filter.topic = { $regex: topic, $options: "i" };

    const lessons = await Lesson.find(filter)
      .populate("createdBy", "firstName lastName")
      .sort({ order: 1, createdAt: -1 });

    res.json(lessons);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching lessons", error: error.message });
  }
};

export const getLessonById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const lesson = await Lesson.findById(req.params.id).populate(
      "createdBy",
      "firstName lastName"
    );

    if (lesson) {
      res.json(lesson);
    } else {
      res.status(404).json({ message: "Lesson not found" });
    }
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching lesson", error: error.message });
  }
};

export const updateLesson = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const lesson = await Lesson.findById(req.params.id);

    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    if (
      lesson.createdBy.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const { title, topic, content, attachments, grade, order } = req.body;

    lesson.title = title || lesson.title;
    lesson.topic = topic || lesson.topic;
    lesson.content = content || lesson.content;
    lesson.grade = grade || lesson.grade;
    if (order !== undefined) lesson.order = order;
    if (attachments !== undefined) lesson.attachments = attachments;

    const updated = await lesson.save();
    const populated = await updated.populate("createdBy", "firstName lastName");
    res.json(populated);
  } catch (error: any) {
    res.status(500).json({ message: "Error updating lesson", error: error.message });
  }
};

export const deleteLesson = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const lesson = await Lesson.findById(req.params.id);

    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    if (
      lesson.createdBy.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(401).json({ message: "Not authorized" });
    }

    await lesson.deleteOne();
    res.json({ message: "Lesson removed" });
  } catch (error: any) {
    res.status(500).json({ message: "Error deleting lesson", error: error.message });
  }
};
