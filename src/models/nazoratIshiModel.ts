import mongoose from "mongoose";

// Question schemas (reuse patterns from courseModel)
const quizOptionSchema = new mongoose.Schema({
  text: { type: String, required: true },
});

const matchPairSchema = new mongoose.Schema({
  left: { type: String, required: true },
  right: { type: String, required: true },
});

const scratchBlockSchema = new mongoose.Schema({
  text: { type: String, required: true },
  order: { type: Number, required: true },
});

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["quiz", "code_challenge", "fill_blank", "match_words", "scratch_blocks"],
    required: true,
  },
  points: { type: Number, default: 10 },
  order: { type: Number, default: 0 },
  // Quiz fields
  question: { type: String },
  options: [quizOptionSchema],
  correctIndex: { type: Number },
  // Code challenge fields
  codeTemplate: { type: String },
  expectedOutput: { type: String },
  language: { type: String, enum: ["javascript", "python"], default: "javascript" },
  hint: { type: String },
  // Fill in the blank fields
  blankText: { type: String },
  blanks: [{ type: String }],
  // Match words fields
  pairs: [matchPairSchema],
  // Scratch blocks fields
  scratchInstruction: { type: String },
  scratchBlocks: [scratchBlockSchema],
});

const nazoratIshiSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignmentType: {
      type: String,
      enum: ["group", "grade", "individual"],
      required: true,
    },
    assignedGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: "Group" }],
    assignedGrade: { type: String },
    assignedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    questions: [questionSchema],
    totalPoints: { type: Number, default: 0 },
    settings: {
      startTime: { type: Date, required: true },
      endTime: { type: Date, required: true },
      shuffleQuestions: { type: Boolean, default: false },
      showResults: { type: Boolean, default: true },
      maxAttempts: { type: Number, default: 1 },
      passingScore: { type: Number, default: 60 },
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "active", "completed"],
      default: "draft",
    },
  },
  { timestamps: true }
);

// Auto-calculate totalPoints before saving
nazoratIshiSchema.pre("save", function () {
  this.totalPoints = this.questions.reduce((sum, q) => sum + (q.points || 0), 0);
});

const NazoratIshi = mongoose.model("NazoratIshi", nazoratIshiSchema);

export default NazoratIshi;
