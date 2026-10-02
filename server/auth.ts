import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "academic_library_secret_key_2026_engineering";

export interface AuthenticatedUser {
  id: string;
  student_code: string;
  full_name: string;
  role: "student" | "admin" | "moderator";
  year_id: string;
  specialization_id: string | null;
  phone: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function generateToken(user: AuthenticatedUser): string {
  return jwt.sign(
    {
      id: user.id,
      student_code: user.student_code,
      full_name: user.full_name,
      role: user.role,
      year_id: user.year_id,
      specialization_id: user.specialization_id,
      phone: user.phone,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next();
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    
    // Check if user is still active in DB
    const result = await db.execute({
      sql: "SELECT id, full_name, phone, student_code, year_id, specialization_id, role, is_active FROM users WHERE id = ?",
      args: [payload.id]
    });

    if (result.rows.length > 0) {
      const row = result.rows[0];
      if (row.is_active === 1) {
        req.user = {
          id: String(row.id),
          student_code: String(row.student_code),
          full_name: String(row.full_name),
          role: String(row.role) as "student" | "admin" | "moderator",
          year_id: String(row.year_id),
          specialization_id: row.specialization_id ? String(row.specialization_id) : null,
          phone: String(row.phone),
        };

        // Update last_seen asynchronously
        const now = new Date().toISOString();
        db.execute({
          sql: "UPDATE users SET last_seen = ? WHERE id = ?",
          args: [now, row.id]
        }).catch(() => {});
      }
    }
  } catch (err) {
    // Invalid token, ignore and proceed as unauthenticated
  }

  next();
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "يجب تسجيل الدخول للوصول إلى هذه الصفحة" });
  }
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "يجب تسجيل الدخول كمسؤول أولاً" });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "هذه الصلاحية خاصة بالمدير الأساسي فقط" });
  }
  next();
}

export function requireContentManager(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "يجب تسجيل الدخول كمسؤول أو مشرف محتوى أولاً" });
  }
  if (req.user.role !== "admin" && req.user.role !== "moderator") {
    return res.status(403).json({ error: "ليس لديك صلاحية لإدارة ورفع المحتوى" });
  }
  next();
}
