import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    topic: {
      type: String,
      required: true,
    },

    content: {
      type: String,
      required: true,
    },

    attachments: [
      {
        type: {
          type: String,
          enum: ["image", "video", "link"],
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        label: {
          type: String,
        },
      },
    ],

    grade: {
      type: String,
      required: true,
    },

    order: {
      type: Number,
      default: 0,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },

  { timestamps: true }
);

const Lesson = mongoose.model("Lesson", lessonSchema);

export default Lesson;
