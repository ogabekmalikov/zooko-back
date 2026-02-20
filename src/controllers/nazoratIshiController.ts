import { Request, Response } from "express";
import NazoratIshi from "../models/nazoratIshiModel.js";
import NazoratIshiResult from "../models/nazoratIshiResultModel.js";
import Group from "../models/groupModel.js";

interface AuthRequest extends Request {
  user?: any;
}

// ==================== ADMIN ENDPOINTS ====================

// Auto-update exam statuses based on current time
async function syncExamStatuses() {
  const now = new Date();
  await NazoratIshi.updateMany(
    { status: "scheduled", "settings.startTime": { $lte: now }, "settings.endTime": { $gt: now } },
    { $set: { status: "active" } }
  );
  await NazoratIshi.updateMany(
    { status: { $in: ["scheduled", "active"] }, "settings.endTime": { $lte: now } },
    { $set: { status: "completed" } }
  );
}

// Get all nazorat ishi
export const getAllNazoratIshi = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    await syncExamStatuses();
    const exams = await NazoratIshi.find()
      .populate("createdBy", "firstName lastName")
      .populate("assignedGroups", "name grade")
      .populate("assignedStudents", "firstName lastName userName")
      .sort({ createdAt: -1 });
    res.json(exams);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching exams", error: error.message });
  }
};

// Get single nazorat ishi
export const getNazoratIshi = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    await syncExamStatuses();
    const exam = await NazoratIshi.findById(req.params.id)
      .populate("createdBy", "firstName lastName")
      .populate("assignedGroups", "name grade students")
      .populate("assignedStudents", "firstName lastName userName");
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    res.json(exam);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching exam", error: error.message });
  }
};

// Create nazorat ishi
export const createNazoratIshi = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { title, description, assignmentType, assignedGroups, assignedGrade, assignedStudents, questions, settings } = req.body;

    if (!title || !assignmentType || !settings?.startTime || !settings?.endTime) {
      return res.status(400).json({ message: "Title, assignment type, and time settings are required" });
    }

    const exam = await NazoratIshi.create({
      title,
      description,
      createdBy: req.user._id,
      assignmentType,
      assignedGroups: assignedGroups || [],
      assignedGrade: assignedGrade || "",
      assignedStudents: assignedStudents || [],
      questions: questions || [],
      settings,
      status: "scheduled",
    });

    const populated = await NazoratIshi.findById(exam._id)
      .populate("assignedGroups", "name grade")
      .populate("assignedStudents", "firstName lastName userName");

    res.status(201).json(populated);
  } catch (error: any) {
    res.status(500).json({ message: "Error creating exam", error: error.message });
  }
};

// Update nazorat ishi
export const updateNazoratIshi = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const exam = await NazoratIshi.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    const { title, description, assignmentType, assignedGroups, assignedGrade, assignedStudents, questions, settings, status } = req.body;

    if (title !== undefined) exam.title = title;
    if (description !== undefined) exam.description = description;
    if (assignmentType !== undefined) exam.assignmentType = assignmentType;
    if (assignedGroups !== undefined) exam.assignedGroups = assignedGroups;
    if (assignedGrade !== undefined) exam.assignedGrade = assignedGrade;
    if (assignedStudents !== undefined) exam.assignedStudents = assignedStudents;
    if (questions !== undefined) exam.questions = questions;
    if (settings !== undefined) exam.settings = { ...exam.settings, ...settings } as any;
    if (status !== undefined) exam.status = status;

    await exam.save();

    const populated = await NazoratIshi.findById(exam._id)
      .populate("assignedGroups", "name grade")
      .populate("assignedStudents", "firstName lastName userName");

    res.json(populated);
  } catch (error: any) {
    res.status(500).json({ message: "Error updating exam", error: error.message });
  }
};

// Delete nazorat ishi
export const deleteNazoratIshi = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const exam = await NazoratIshi.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    await NazoratIshiResult.deleteMany({ nazoratIshi: exam._id });
    await exam.deleteOne();
    res.json({ message: "Exam deleted" });
  } catch (error: any) {
    res.status(500).json({ message: "Error deleting exam", error: error.message });
  }
};

// Get results for a nazorat ishi (admin)
export const getExamResults = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const results = await NazoratIshiResult.find({ nazoratIshi: req.params.id })
      .populate("student", "firstName lastName userName avatar")
      .sort({ totalScore: -1 });
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching results", error: error.message });
  }
};

// Get single student result detail (admin)
export const getStudentResult = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const result = await NazoratIshiResult.findById(req.params.resultId)
      .populate("student", "firstName lastName userName avatar")
      .populate("nazoratIshi");
    if (!result) return res.status(404).json({ message: "Result not found" });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching result", error: error.message });
  }
};

// Manual grade (admin)
export const manualGrade = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const result = await NazoratIshiResult.findById(req.params.resultId);
    if (!result) return res.status(404).json({ message: "Result not found" });

    const { answers, comments } = req.body;

    // Update individual answer scores if provided
    if (answers && Array.isArray(answers)) {
      for (const update of answers) {
        const answer = result.answers.find((a: any) => a.questionId.toString() === update.questionId);
        if (answer) {
          answer.isCorrect = update.isCorrect;
          answer.pointsEarned = update.pointsEarned;
        }
      }
    }

    result.totalScore = result.answers.reduce((sum: number, a: any) => sum + (a.pointsEarned || 0), 0);

    const exam = await NazoratIshi.findById(result.nazoratIshi);
    if (exam && exam.totalPoints > 0) {
      result.percentage = Math.round((result.totalScore / exam.totalPoints) * 100);
    }

    result.manualReview = {
      reviewed: true,
      reviewedBy: req.user._id,
      comments: comments || "",
    };
    result.status = "graded";

    await result.save();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: "Error grading", error: error.message });
  }
};

// Get violations for an exam (admin, real-time polling)
export const getExamViolations = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const results = await NazoratIshiResult.find({
      nazoratIshi: req.params.id,
      violationCount: { $gt: 0 },
    })
      .populate("student", "firstName lastName userName avatar")
      .select("student violations violationCount status")
      .sort({ violationCount: -1 });
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching violations", error: error.message });
  }
};

// ==================== STUDENT ENDPOINTS ====================

// Get assigned exams for current student
export const getMyExams = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    await syncExamStatuses();
    const userId = req.user._id;
    const userGrade = req.user.grade;

    // Find groups the student belongs to
    const groups = await Group.find({ students: userId });
    const groupIds = groups.map((g: any) => g._id);

    const exams = await NazoratIshi.find({
      status: { $in: ["scheduled", "active", "completed"] },
      $or: [
        { assignmentType: "individual", assignedStudents: userId },
        { assignmentType: "group", assignedGroups: { $in: groupIds } },
        { assignmentType: "grade", assignedGrade: userGrade },
      ],
    })
      .select("-questions.correctIndex -questions.blanks -questions.expectedOutput")
      .sort({ "settings.startTime": -1 });

    // Attach result status for each exam
    const examIds = exams.map((e: any) => e._id);
    const results = await NazoratIshiResult.find({
      nazoratIshi: { $in: examIds },
      student: userId,
    }).select("nazoratIshi status totalScore percentage");

    const resultMap = new Map();
    results.forEach((r: any) => resultMap.set(r.nazoratIshi.toString(), r));

    const examsWithStatus = exams.map((exam: any) => {
      const e = exam.toObject();
      const result = resultMap.get(e._id.toString());
      e.myResult = result || null;
      return e;
    });

    res.json(examsWithStatus);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching exams", error: error.message });
  }
};

// Start exam (student)
export const startExam = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    await syncExamStatuses();
    const exam = await NazoratIshi.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: "Imtihon topilmadi" });

    const now = new Date();
    if (now < exam.settings!.startTime) {
      return res.status(400).json({ message: "Imtihon hali boshlanmagan" });
    }
    if (now > exam.settings!.endTime) {
      return res.status(400).json({ message: "Imtihon vaqti tugagan" });
    }

    // Strip correct answers from questions
    const stripAnswers = (examDoc: any) => {
      const data = examDoc.toObject();
      data.questions = data.questions.map((q: any) => {
        const { correctIndex, blanks, expectedOutput, ...safe } = q;
        return safe;
      });
      return data;
    };

    // Check if already started
    const existing = await NazoratIshiResult.findOne({
      nazoratIshi: exam._id,
      student: req.user._id,
    });

    if (existing) {
      if (existing.status === "submitted" || existing.status === "graded") {
        return res.status(400).json({ message: "Siz allaqachon topshirgansiz" });
      }
      return res.json({ exam: stripAnswers(exam), result: existing });
    }

    // Create new result (handle duplicate key from React StrictMode double-fire)
    let result;
    try {
      result = await NazoratIshiResult.create({
        nazoratIshi: exam._id,
        student: req.user._id,
        startedAt: now,
      });
    } catch (err: any) {
      if (err.code === 11000) {
        // Duplicate key - race condition, fetch existing
        result = await NazoratIshiResult.findOne({
          nazoratIshi: exam._id,
          student: req.user._id,
        });
        if (!result) return res.status(500).json({ message: "Xatolik yuz berdi" });
      } else {
        throw err;
      }
    }

    res.json({ exam: stripAnswers(exam), result });
  } catch (error: any) {
    console.error("startExam error:", error);
    res.status(500).json({ message: "Imtihonni boshlashda xatolik", error: error.message });
  }
};

// Submit exam (student)
export const submitExam = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const result = await NazoratIshiResult.findOne({
      nazoratIshi: req.params.id,
      student: req.user._id,
    });
    if (!result) return res.status(404).json({ message: "Exam not started" });
    if (result.status !== "in_progress") {
      return res.status(400).json({ message: "Exam already submitted" });
    }

    const exam = await NazoratIshi.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    const { answers } = req.body;

    // Auto-grade answers
    const gradedAnswers = (answers || []).map((ans: any) => {
      const question = exam.questions.find((q: any) => q._id.toString() === ans.questionId);
      if (!question) return { ...ans, isCorrect: false, pointsEarned: 0 };

      let isCorrect = false;
      switch (question.type) {
        case "quiz":
          isCorrect = ans.answer === question.correctIndex;
          break;
        case "fill_blank":
          if (Array.isArray(ans.answer) && Array.isArray(question.blanks)) {
            isCorrect = ans.answer.length === question.blanks.length &&
              ans.answer.every((a: string, i: number) =>
                a.trim().toLowerCase() === question.blanks[i].trim().toLowerCase()
              );
          }
          break;
        case "match_words":
          if (Array.isArray(ans.answer) && Array.isArray(question.pairs)) {
            isCorrect = ans.answer.length === question.pairs.length &&
              ans.answer.every((pair: any, i: number) =>
                pair.left === question.pairs[i].left && pair.right === question.pairs[i].right
              );
          }
          break;
        case "scratch_blocks":
          if (Array.isArray(ans.answer) && Array.isArray(question.scratchBlocks)) {
            const sorted = [...question.scratchBlocks].sort((a, b) => a.order - b.order);
            isCorrect = ans.answer.length === sorted.length &&
              ans.answer.every((text: string, i: number) => text === sorted[i].text);
          }
          break;
        case "code_challenge":
          // Code challenges need manual review or a code runner
          isCorrect = false;
          break;
      }

      return {
        questionId: ans.questionId,
        answer: ans.answer,
        isCorrect,
        pointsEarned: isCorrect ? (question.points || 0) : 0,
      };
    });

    result.answers = gradedAnswers;
    result.totalScore = gradedAnswers.reduce((sum: number, a: any) => sum + a.pointsEarned, 0);
    result.percentage = exam.totalPoints > 0 ? Math.round((result.totalScore / exam.totalPoints) * 100) : 0;
    result.status = "submitted";
    result.submittedAt = new Date();

    await result.save();

    // Check if code challenges exist (needs manual review)
    const hasCodeChallenge = exam.questions.some((q: any) => q.type === "code_challenge");
    const responseData: any = result.toObject();
    responseData.needsManualReview = hasCodeChallenge;

    res.json(responseData);
  } catch (error: any) {
    res.status(500).json({ message: "Error submitting exam", error: error.message });
  }
};

// Report violation (student client)
export const reportViolation = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const result = await NazoratIshiResult.findOne({
      nazoratIshi: req.params.id,
      student: req.user._id,
      status: "in_progress",
    });
    if (!result) return res.status(404).json({ message: "Active exam not found" });

    const { type, details } = req.body;
    result.violations.push({ type, details, timestamp: new Date() });
    result.violationCount = result.violations.length;
    await result.save();

    res.json({ violationCount: result.violationCount });
  } catch (error: any) {
    res.status(500).json({ message: "Error reporting violation", error: error.message });
  }
};

// Get my result (student)
export const getMyResult = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const exam = await NazoratIshi.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    if (!exam.settings!.showResults) {
      return res.status(403).json({ message: "Natijalar yopiq" });
    }

    const result = await NazoratIshiResult.findOne({
      nazoratIshi: req.params.id,
      student: req.user._id,
    });
    if (!result) return res.status(404).json({ message: "Result not found" });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching result", error: error.message });
  }
};
