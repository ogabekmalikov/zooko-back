import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { dirname } from "path";
import connectDb from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import nazoratIshiRoutes from "./routes/nazoratIshiRoutes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(morgan("dev"));

const uploadsPath = path.join(__dirname, "../uploads");
app.use("/uploads", express.static(uploadsPath));
const startServer = async () => {
  try {
    await fs.mkdir(uploadsPath, { recursive: true });
    await connectDb();

    console.log(
      `Memory used: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`,
    );

    app.use("/api/auth", authRoutes);
    app.use("/api/courses", courseRoutes);
    app.use("/api/progress", progressRoutes);
    app.use("/api/upload", uploadRoutes);
    app.use("/api/notifications", notificationRoutes);
    app.use("/api/groups", groupRoutes);
    app.use("/api/nazorat-ishi", nazoratIshiRoutes);

    app.get("/health", (req, res) => {
      res.status(200).json({ status: "OK", message: "Server is running" });
    });

    app.use(
      (
        err: any,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
      ) => {
        console.error("Error:", err);

        if (err.name === "MulterError") {
          return res.status(400).json({
            message: "File upload error",
            error: err.message,
            code: err.code,
          });
        }

        const statusCode =
          res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
        res.status(statusCode).json({
          message: err.message || "Internal Server Error",
          stack: process.env.NODE_ENV === "production" ? null : err.stack,
        });
      },
    );

    const PORT = process.env.PORT || 8080;

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Server startup error:", error);
    process.exit(1);
  }
};

startServer();
