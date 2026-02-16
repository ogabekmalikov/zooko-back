import mongoose from "mongoose";

const badgeSchema = new mongoose.Schema({
  key: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  earnedAt: { type: Date, default: Date.now },
});

const quizScoreSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  lessonId: { type: String, required: true },
  contentId: { type: String, required: true },
  correct: { type: Boolean, required: true },
  xpEarned: { type: Number, default: 0 },
  answeredAt: { type: Date, default: Date.now },
});

const progressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    totalXP: { type: Number, default: 0 },
    level: { type: String, default: "Beginner" },
    lessonsCompleted: [
      {
        courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
        lessonId: { type: String },
        completedAt: { type: Date, default: Date.now },
        xpEarned: { type: Number, default: 10 },
      },
    ],
    quizScores: [quizScoreSchema],
    badges: [badgeSchema],
    streak: { type: Number, default: 0 },
    lastLoginDate: { type: String, default: "" },
    dailyXPClaimed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Progress = mongoose.model("Progress", progressSchema);

export default Progress;
