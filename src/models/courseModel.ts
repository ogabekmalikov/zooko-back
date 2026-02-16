import mongoose from "mongoose";

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

const lessonContentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["video", "image", "text", "quiz", "code_challenge", "fill_blank", "match_words", "scratch_blocks"],
    required: true,
  },
  data: {
    type: String,
    default: "",
  },
  // Quiz-specific fields
  question: { type: String },
  options: [quizOptionSchema],
  correctIndex: { type: Number },
  xpReward: { type: Number, default: 20 },
  // Image-specific fields
  imageSize: { type: String, enum: ["small", "medium", "large", "full"], default: "full" },
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
  order: {
    type: Number,
    default: 0,
  },
});

const lessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  content: [lessonContentSchema],
  order: {
    type: Number,
    default: 0,
  },
});

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    grade: {
      type: String,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lessons: [lessonSchema],
  },
  { timestamps: true }
);

const Course = mongoose.model("Course", courseSchema);

export default Course;
