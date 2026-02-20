import mongoose from "mongoose";

const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  answer: { type: mongoose.Schema.Types.Mixed },
  isCorrect: { type: Boolean, default: false },
  pointsEarned: { type: Number, default: 0 },
});

const violationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["tab_switch", "fullscreen_exit", "copy_attempt", "paste_attempt", "right_click"],
    required: true,
  },
  timestamp: { type: Date, default: Date.now },
  details: { type: String, default: "" },
});

const nazoratIshiResultSchema = new mongoose.Schema(
  {
    nazoratIshi: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NazoratIshi",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    answers: [answerSchema],
    totalScore: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["in_progress", "submitted", "graded"],
      default: "in_progress",
    },
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date },
    manualReview: {
      reviewed: { type: Boolean, default: false },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      comments: { type: String, default: "" },
    },
    violations: [violationSchema],
    violationCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Compound index: one result per student per exam
nazoratIshiResultSchema.index({ nazoratIshi: 1, student: 1 }, { unique: true });

const NazoratIshiResult = mongoose.model("NazoratIshiResult", nazoratIshiResultSchema);

export default NazoratIshiResult;
