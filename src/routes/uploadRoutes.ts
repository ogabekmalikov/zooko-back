import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import crypto from "crypto";
import { protect } from "../middlewares/authMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const storage = multer.diskStorage({
  destination: path.join(__dirname, "../../uploads"),
  filename: (_req, file, cb) => {
    const unique = crypto.randomBytes(8).toString("hex");
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const imageUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype.replace("image/", ""));
    if (ext || mime) {
      cb(null, true);
    } else {
      cb(new Error("Faqat rasm fayllari ruxsat etiladi (jpg, png, gif, webp, svg)"));
    }
  },
});

const videoUpload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (_req, file, cb) => {
    const allowed = /mp4|webm|ogg|mov|avi|mkv/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = /^video\//.test(file.mimetype);
    if (ext || mime) {
      cb(null, true);
    } else {
      cb(new Error("Faqat video fayllari ruxsat etiladi (mp4, webm, ogg, mov)"));
    }
  },
});

const router = express.Router();

router.post("/", protect, imageUpload.single("image"), (req: any, res: any) => {
  if (!req.file) {
    return res.status(400).json({ message: "Rasm fayli yuborilmadi" });
  }
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

router.post("/video", protect, videoUpload.single("video"), (req: any, res: any) => {
  if (!req.file) {
    return res.status(400).json({ message: "Video fayli yuborilmadi" });
  }
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

export default router;
