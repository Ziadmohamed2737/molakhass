import { Router, Response } from "express";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { getSafeFilePath } from "../storage";
import { AuthRequest } from "../auth";

const JWT_SECRET = process.env.JWT_SECRET || "academic_library_secret_key_2026_engineering";

export const filesRouter = Router();

// Helper to authenticate file access (from auth header, cookie, or query param)
async function verifyFileAccess(req: AuthRequest): Promise<boolean> {
  let token = req.cookies?.token;
  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token && req.query.token) {
    token = String(req.query.token);
  }

  if (!token) return false;

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const userRes = await db.execute({
      sql: "SELECT id, is_active FROM users WHERE id = ?",
      args: [payload.id]
    });
    return userRes.rows.length > 0 && userRes.rows[0].is_active === 1;
  } catch {
    return false;
  }
}

// Inline View (Images, PDF preview)
filesRouter.get("/:id/view", async (req: AuthRequest, res: Response) => {
  try {
    const isAuthed = await verifyFileAccess(req);
    if (!isAuthed) {
      return res.status(401).send("غير مصرح لك بالوصول إلى هذا الملف. يرجى تسجيل الدخول.");
    }

    const { id } = req.params;
    const result = await db.execute({
      sql: "SELECT file_path, file_type, display_name FROM documents WHERE id = ?",
      args: [id]
    });

    if (result.rows.length === 0) {
      return res.status(404).send("الملف غير موجود");
    }

    const doc = result.rows[0];
    const safePath = getSafeFilePath(String(doc.file_path));

    if (!safePath) {
      return res.status(404).send("ملف التخزين غير موجود على الخادم");
    }

    res.setHeader("Content-Type", String(doc.file_type));
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(String(doc.display_name))}"`);
    res.setHeader("Cache-Control", "public, max-age=86400");

    const readStream = fs.createReadStream(safePath);
    readStream.pipe(res);
  } catch (err: any) {
    console.error("View file error:", err);
    res.status(500).send("فشل عرض الملف");
  }
});

// Real Download (forces download with proper filename)
filesRouter.get("/:id/download", async (req: AuthRequest, res: Response) => {
  try {
    const isAuthed = await verifyFileAccess(req);
    if (!isAuthed) {
      return res.status(401).send("غير مصرح لك بتحميل هذا الملف. يرجى تسجيل الدخول.");
    }

    const { id } = req.params;
    const result = await db.execute({
      sql: "SELECT file_path, file_type, display_name FROM documents WHERE id = ?",
      args: [id]
    });

    if (result.rows.length === 0) {
      return res.status(404).send("الملف غير موجود");
    }

    const doc = result.rows[0];
    const safePath = getSafeFilePath(String(doc.file_path));

    if (!safePath) {
      return res.status(404).send("ملف التخزين غير موجود على الخادم");
    }

    const ext = path.extname(safePath) || "";
    let cleanName = String(doc.display_name).trim();
    if (!cleanName.endsWith(ext)) {
      cleanName += ext;
    }

    res.setHeader("Content-Type", String(doc.file_type));
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(cleanName)}"; filename*=UTF-8''${encodeURIComponent(cleanName)}`);

    const readStream = fs.createReadStream(safePath);
    readStream.pipe(res);
  } catch (err: any) {
    console.error("Download file error:", err);
    res.status(500).send("فشل تحميل الملف");
  }
});
