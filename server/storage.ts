import multer from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";

const baseUploadDir = path.resolve(process.cwd(), "uploads");

if (!fs.existsSync(baseUploadDir)) {
  fs.mkdirSync(baseUploadDir, { recursive: true });
}

// Storage engine with organized subject/category subfolders
const storage = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    const subjectId = (req.body.subject_id as string) || (req.params.subjectId as string) || "general";
    const category = (req.body.category as string) || "documents";
    
    const targetDir = path.join(baseUploadDir, "subjects", subjectId, category);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    // Generate safe unique filename with timestamp & clean extension
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `file-${uniqueSuffix}${ext}`);
  }
});

// Allowed file types: JPG, JPEG, PNG, WEBP, PDF
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf"
];

const fileFilter: multer.Options["fileFilter"] = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];

  if (ALLOWED_MIME_TYPES.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("نوع الملف غير مدعوم. يُسمح فقط بملفات PDF والصور (JPG, PNG, WEBP)"));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB max
  }
});

export function getSafeFilePath(storedRelativePath: string): string | null {
  const fullPath = path.resolve(storedRelativePath);
  // Ensure the file is inside uploads folder to prevent directory traversal
  if (fullPath.startsWith(baseUploadDir) && fs.existsSync(fullPath)) {
    return fullPath;
  }
  return null;
}
