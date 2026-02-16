import { Request, Response } from "express";
import Progress from "../models/progressModel.js";
import Course from "../models/courseModel.js";

interface AuthRequest extends Request {
  user?: any;
}

const LEVELS = [
  { name: "Boshlang'ich", minXP: 0 },
  { name: "Kashfiyotchi", minXP: 100 },
  { name: "Dasturchi", minXP: 300 },
  { name: "Xaker", minXP: 600 },
  { name: "Usta", minXP: 1000 },
];

const BADGE_DEFINITIONS = [
  { key: "first_lesson", title: "Birinchi qadam", description: "Birinchi darsni yakunlang", icon: "🎯", check: (p: any) => p.lessonsCompleted.length >= 1 },
  { key: "five_lessons", title: "Tez o'rganuvchi", description: "5 ta darsni yakunlang", icon: "📚", check: (p: any) => p.lessonsCompleted.length >= 5 },
  { key: "ten_lessons", title: "Dars ustasi", description: "10 ta darsni yakunlang", icon: "🏆", check: (p: any) => p.lessonsCompleted.length >= 10 },
  { key: "first_quiz", title: "Birinchi test", description: "Birinchi testni yeching", icon: "❓", check: (p: any) => p.quizScores.length >= 1 },
  { key: "five_quizzes", title: "Test ustasi", description: "5 ta testni to'g'ri yeching", icon: "🧠", check: (p: any) => p.quizScores.filter((q: any) => q.correct).length >= 5 },
  { key: "streak_3", title: "Yonib turibdi", description: "3 kunlik davomiylik", icon: "🔥", check: (p: any) => p.streak >= 3 },
  { key: "streak_7", title: "To'xtovsiz", description: "7 kunlik davomiylik", icon: "⚡", check: (p: any) => p.streak >= 7 },
  { key: "xp_100", title: "Ko'tarilayotgan yulduz", description: "100 XP to'plang", icon: "⭐", check: (p: any) => p.totalXP >= 100 },
  { key: "xp_500", title: "XP ovchisi", description: "500 XP to'plang", icon: "💎", check: (p: any) => p.totalXP >= 500 },
  { key: "xp_1000", title: "Legenda", description: "1000 XP to'plang", icon: "👑", check: (p: any) => p.totalXP >= 1000 },
];

function computeLevel(xp: number): string {
  let level = LEVELS[0].name;
  for (const l of LEVELS) {
    if (xp >= l.minXP) level = l.name;
  }
  return level;
}

function checkNewBadges(progress: any): any[] {
  const earned = new Set(progress.badges.map((b: any) => b.key));
  const newBadges: any[] = [];
  for (const def of BADGE_DEFINITIONS) {
    if (!earned.has(def.key) && def.check(progress)) {
      const badge = { key: def.key, title: def.title, description: def.description, icon: def.icon, earnedAt: new Date() };
      progress.badges.push(badge);
      newBadges.push(badge);
    }
  }
  return newBadges;
}

async function getOrCreateProgress(userId: string) {
  let progress = await Progress.findOne({ userId });
  if (!progress) {
    progress = new Progress({ userId });
    await progress.save();
  }
  return progress;
}

export const getProgress = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const progress = await getOrCreateProgress(req.user._id);
    res.json(progress);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching progress", error: error.message });
  }
};

export const completeLesson = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { courseId, lessonId } = req.body;
    const progress = await getOrCreateProgress(req.user._id);

    const already = progress.lessonsCompleted.find(
      (lc: any) => lc.courseId?.toString() === courseId && lc.lessonId === lessonId
    );
    if (already) return res.json({ progress, newBadges: [], xpEarned: 0, alreadyCompleted: true });

    const xpEarned = 10;
    progress.lessonsCompleted.push({ courseId, lessonId, xpEarned } as any);
    progress.totalXP += xpEarned;
    progress.level = computeLevel(progress.totalXP);
    const newBadges = checkNewBadges(progress);
    await progress.save();

    res.json({ progress, newBadges, xpEarned });
  } catch (error: any) {
    res.status(500).json({ message: "Error completing lesson", error: error.message });
  }
};

export const submitQuiz = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { courseId, lessonId, contentId, selectedIndex } = req.body;
    const progress = await getOrCreateProgress(req.user._id);

    const alreadyAnswered = progress.quizScores.find(
      (qs: any) => qs.contentId === contentId
    );
    if (alreadyAnswered) return res.json({ progress, newBadges: [], xpEarned: 0, alreadyAnswered: true, correct: alreadyAnswered.correct });

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const lesson = course.lessons.id(lessonId as string);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    const content = lesson.content.id(contentId as string);
    if (!content || content.type !== "quiz") return res.status(400).json({ message: "Quiz not found" });

    const correct = content.correctIndex === selectedIndex;
    const xpEarned = correct ? (content.xpReward || 20) : 0;

    progress.quizScores.push({ courseId, lessonId, contentId, correct, xpEarned } as any);
    progress.totalXP += xpEarned;
    progress.level = computeLevel(progress.totalXP);
    const newBadges = checkNewBadges(progress);
    await progress.save();

    res.json({ progress, newBadges, xpEarned, correct });
  } catch (error: any) {
    res.status(500).json({ message: "Error submitting quiz", error: error.message });
  }
};

export const claimDailyLogin = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const progress = await getOrCreateProgress(req.user._id);
    const today = new Date().toISOString().split("T")[0];

    if (progress.lastLoginDate === today) {
      return res.json({ progress, newBadges: [], xpEarned: 0, alreadyClaimed: true });
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    if (progress.lastLoginDate === yesterday) {
      progress.streak += 1;
    } else {
      progress.streak = 1;
    }

    const xpEarned = 5;
    progress.lastLoginDate = today;
    progress.totalXP += xpEarned;
    progress.level = computeLevel(progress.totalXP);
    const newBadges = checkNewBadges(progress);
    await progress.save();

    res.json({ progress, newBadges, xpEarned, streak: progress.streak });
  } catch (error: any) {
    res.status(500).json({ message: "Error claiming daily login", error: error.message });
  }
};

export const submitInteractive = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { courseId, lessonId, contentId, answer } = req.body;
    const progress = await getOrCreateProgress(req.user._id);

    const alreadyAnswered = progress.quizScores.find(
      (qs: any) => qs.contentId === contentId
    );
    if (alreadyAnswered) return res.json({ progress, newBadges: [], xpEarned: 0, alreadyAnswered: true, correct: alreadyAnswered.correct });

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const lesson = course.lessons.id(lessonId as string);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    const content = lesson.content.id(contentId as string);
    if (!content) return res.status(400).json({ message: "Content not found" });

    let correct = false;
    if (content.type === "code_challenge") {
      const output = (answer || "").trim();
      correct = output === (content.expectedOutput || "").trim();
    } else if (content.type === "fill_blank") {
      const userAnswers: string[] = answer || [];
      const correctAnswers: string[] = content.blanks || [];
      correct = userAnswers.length === correctAnswers.length &&
        userAnswers.every((a: string, i: number) => a.trim().toLowerCase() === correctAnswers[i].trim().toLowerCase());
    } else if (content.type === "match_words") {
      const userPairs: { left: string; right: string }[] = answer || [];
      const correctPairs: any[] = content.pairs || [];
      correct = userPairs.length === correctPairs.length &&
        correctPairs.every((cp: any) => userPairs.some((up) => up.left === cp.left && up.right === cp.right));
    } else if (content.type === "scratch_blocks") {
      const userOrder: string[] = answer || [];
      const correctOrder = (content.scratchBlocks || [])
        .sort((a: any, b: any) => a.order - b.order)
        .map((b: any) => b.text);
      correct = JSON.stringify(userOrder) === JSON.stringify(correctOrder);
    }

    const xpEarned = correct ? (content.xpReward || 20) : 0;
    progress.quizScores.push({ courseId, lessonId, contentId, correct, xpEarned } as any);
    progress.totalXP += xpEarned;
    progress.level = computeLevel(progress.totalXP);
    const newBadges = checkNewBadges(progress);
    await progress.save();

    res.json({ progress, newBadges, xpEarned, correct });
  } catch (error: any) {
    res.status(500).json({ message: "Error submitting interactive", error: error.message });
  }
};

export const getAdminStats = async (req: Request, res: Response): Promise<any> => {
  try {
    const User = (await import("../models/userModel.js")).default;
    const [studentCount, courseCount, courses, allProgress] = await Promise.all([
      User.countDocuments({ role: "user" }),
      Course.countDocuments(),
      Course.find().select("lessons"),
      Progress.find().select("lessonsCompleted quizScores totalXP"),
    ]);

    let lessonCount = 0;
    let quizCount = 0;
    let interactiveCount = 0;
    for (const c of courses) {
      lessonCount += c.lessons.length;
      for (const l of c.lessons) {
        for (const content of l.content) {
          if (content.type === "quiz") quizCount++;
          if (["code_challenge", "fill_blank", "match_words", "scratch_blocks"].includes(content.type)) interactiveCount++;
        }
      }
    }

    let totalLessonsCompleted = 0;
    let totalQuizAnswered = 0;
    let totalXPEarned = 0;
    for (const p of allProgress) {
      totalLessonsCompleted += p.lessonsCompleted.length;
      totalQuizAnswered += p.quizScores.length;
      totalXPEarned += p.totalXP;
    }

    const recentStudents = await User.find({ role: "user" })
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      studentCount,
      courseCount,
      lessonCount,
      quizCount,
      interactiveCount,
      totalLessonsCompleted,
      totalQuizAnswered,
      totalXPEarned,
      activeStudents: allProgress.length,
      recentStudents,
    });
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching admin stats", error: error.message });
  }
};

export const getLeaderboard = async (req: Request, res: Response): Promise<any> => {
  try {
    const leaders = await Progress.find()
      .sort({ totalXP: -1 })
      .limit(10)
      .populate("userId", "firstName lastName avatar grade");
    res.json(leaders);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching leaderboard", error: error.message });
  }
};
