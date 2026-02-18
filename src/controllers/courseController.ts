import { Request, Response } from "express";
import Course from "../models/courseModel.js";

interface AuthRequest extends Request {
  user?: any;
}

export const createCourse = async (
  req: AuthRequest,
  res: Response,
): Promise<any> => {
  try {
    const { title, description, grade } = req.body;
    const course = new Course({
      title,
      description,
      grade,
      createdBy: req.user._id,
      lessons: [],
    });
    const created = await course.save();
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ message: "Error creating course", error: error.message });
  }
};

export const getCourses = async (req: Request, res: Response): Promise<any> => {
  try {
    const filter: any = {};
    if (req.query.grades) {
      // Multiple grades: show courses for any of these grades + "all"
      const gradeList = (req.query.grades as string).split(",");
      filter.$or = [
        { grade: { $in: gradeList } },
        { grade: "all" },
      ];
    } else if (req.query.grade) {
      filter.$or = [{ grade: req.query.grade }, { grade: "all" }];
    }
    const courses = await Course.find(filter)
      .populate("createdBy", "firstName lastName")
      .sort({ createdAt: -1 });
    res.json(courses);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching courses", error: error.message });
  }
};

export const getCourseById = async (req: Request, res: Response): Promise<any> => {
  try {
    const course = await Course.findById(req.params.id).populate("createdBy", "firstName lastName");
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json(course);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching course", error: error.message });
  }
};

export const updateCourse = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const { title, description, grade } = req.body;
    if (title) course.title = title;
    if (description) course.description = description;
    if (grade) course.grade = grade;

    const updated = await course.save();
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: "Error updating course", error: error.message });
  }
};

export const deleteCourse = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    await course.deleteOne();
    res.json({ message: "Course removed" });
  } catch (error: any) {
    res.status(500).json({ message: "Error deleting course", error: error.message });
  }
};

// Add a lesson to a course
export const addLesson = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const { title, description } = req.body;
    const order = course.lessons.length;
    course.lessons.push({ title, description, order, content: [] } as any);
    await course.save();
    res.status(201).json(course);
  } catch (error: any) {
    res.status(500).json({ message: "Error adding lesson", error: error.message });
  }
};

// Update a lesson
export const updateLesson = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const lesson = course.lessons.id(req.params.lessonId as string);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    const { title, description } = req.body;
    if (title) lesson.title = title;
    if (description !== undefined) lesson.description = description;

    await course.save();
    res.json(course);
  } catch (error: any) {
    res.status(500).json({ message: "Error updating lesson", error: error.message });
  }
};

// Delete a lesson
export const deleteLesson = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    course.lessons.pull({ _id: req.params.lessonId });
    await course.save();
    res.json(course);
  } catch (error: any) {
    res.status(500).json({ message: "Error deleting lesson", error: error.message });
  }
};

// Add content block to a lesson
export const addContent = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const lesson = course.lessons.id(req.params.lessonId as string);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    const {
      type, data, question, options, correctIndex, xpReward, imageSize,
      codeTemplate, expectedOutput, language, hint,
      blankText, blanks,
      pairs,
      scratchInstruction, scratchBlocks,
    } = req.body;
    const order = lesson.content.length;
    const contentBlock: any = { type, data: data || "", order, xpReward: xpReward || 20 };
    if (type === "quiz") {
      contentBlock.question = question;
      contentBlock.options = options;
      contentBlock.correctIndex = correctIndex;
    }
    if (type === "image" && imageSize) {
      contentBlock.imageSize = imageSize;
    }
    if (type === "code_challenge") {
      contentBlock.question = question;
      contentBlock.codeTemplate = codeTemplate || "";
      contentBlock.expectedOutput = expectedOutput || "";
      contentBlock.language = language || "javascript";
      contentBlock.hint = hint || "";
    }
    if (type === "fill_blank") {
      contentBlock.blankText = blankText || "";
      contentBlock.blanks = blanks || [];
    }
    if (type === "match_words") {
      contentBlock.question = question;
      contentBlock.pairs = pairs || [];
    }
    if (type === "scratch_blocks") {
      contentBlock.scratchInstruction = scratchInstruction || "";
      contentBlock.scratchBlocks = scratchBlocks || [];
    }
    lesson.content.push(contentBlock);
    await course.save();
    res.status(201).json(course);
  } catch (error: any) {
    res.status(500).json({ message: "Error adding content", error: error.message });
  }
};

// Update a content block in a lesson
export const updateContent = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const lesson = course.lessons.id(req.params.lessonId as string);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    const block = lesson.content.id(req.params.contentId as string);
    if (!block) return res.status(404).json({ message: "Content not found" });

    const {
      data, question, options, correctIndex, xpReward, imageSize,
      codeTemplate, expectedOutput, language, hint,
      blankText, blanks,
      pairs,
      scratchInstruction, scratchBlocks,
    } = req.body;
    if (data !== undefined) block.data = data;
    if (xpReward !== undefined) block.xpReward = xpReward;
    if (block.type === "quiz") {
      if (question !== undefined) block.question = question;
      if (options !== undefined) block.options = options;
      if (correctIndex !== undefined) block.correctIndex = correctIndex;
    }
    if (block.type === "image" && imageSize !== undefined) {
      block.imageSize = imageSize;
    }
    if (block.type === "code_challenge") {
      if (question !== undefined) block.question = question;
      if (codeTemplate !== undefined) block.codeTemplate = codeTemplate;
      if (expectedOutput !== undefined) block.expectedOutput = expectedOutput;
      if (language !== undefined) block.language = language;
      if (hint !== undefined) block.hint = hint;
    }
    if (block.type === "fill_blank") {
      if (blankText !== undefined) block.blankText = blankText;
      if (blanks !== undefined) block.blanks = blanks;
    }
    if (block.type === "match_words") {
      if (question !== undefined) block.question = question;
      if (pairs !== undefined) block.pairs = pairs;
    }
    if (block.type === "scratch_blocks") {
      if (scratchInstruction !== undefined) block.scratchInstruction = scratchInstruction;
      if (scratchBlocks !== undefined) block.scratchBlocks = scratchBlocks;
    }

    await course.save();
    res.json(course);
  } catch (error: any) {
    res.status(500).json({ message: "Error updating content", error: error.message });
  }
};

// Delete a content block from a lesson
export const deleteContent = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const lesson = course.lessons.id(req.params.lessonId as string);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    lesson.content.pull({ _id: req.params.contentId });
    await course.save();
    res.json(course);
  } catch (error: any) {
    res.status(500).json({ message: "Error deleting content", error: error.message });
  }
};

// Reorder content blocks inside a lesson
export const reorderContent = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const lesson = course.lessons.id(req.params.lessonId as string);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    const { orderedIds } = req.body as { orderedIds: string[] };
    const reordered = orderedIds.map((cid: string, i: number) => {
      const block = lesson.content.id(cid);
      if (block) block.order = i;
      return block;
    }).filter(Boolean);

    lesson.content = reordered as any;
    await course.save();
    res.json(course);
  } catch (error: any) {
    res.status(500).json({ message: "Error reordering content", error: error.message });
  }
};

// Reorder lessons inside a course
export const reorderLessons = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const { orderedIds } = req.body as { orderedIds: string[] };
    const reordered = orderedIds.map((lid: string, i: number) => {
      const lesson = course.lessons.id(lid);
      if (lesson) lesson.order = i;
      return lesson;
    }).filter(Boolean);

    course.lessons = reordered as any;
    await course.save();
    res.json(course);
  } catch (error: any) {
    res.status(500).json({ message: "Error reordering lessons", error: error.message });
  }
};
