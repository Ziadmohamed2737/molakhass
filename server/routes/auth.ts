import { Router, Response } from "express";
import crypto from "crypto";
import { db } from "../db";
import {
  hashPassword,
  comparePassword,
  generateToken,
  AuthRequest,
  requireAuth
} from "../auth";

export const authRouter = Router();

// Check if an admin exists
authRouter.get("/admin-status", async (req, res) => {
  try {
    const result = await db.execute("SELECT COUNT(*) as c FROM users WHERE role = 'admin'");
    const count = Number(result.rows[0].c);
    res.json({ hasAdmin: count > 0 });
  } catch (err: any) {
    res.status(500).json({ error: "فشل فحص حالة المسؤول" });
  }
});

// Initial Admin Setup (only works if no admin exists yet)
authRouter.post("/admin-setup", async (req, res) => {
  try {
    const existing = await db.execute("SELECT COUNT(*) as c FROM users WHERE role = 'admin'");
    if (Number(existing.rows[0].c) > 0) {
      return res.status(400).json({ error: "حساب الإدارة مهيأ بالفعل. يرجى تسجيل الدخول كمسؤول." });
    }

    const { full_name, phone, student_code, password, confirm_password } = req.body;

    if (!full_name || !phone || !student_code || !password) {
      return res.status(400).json({ error: "جميع الحقول مطلوبة" });
    }

    if (password !== confirm_password) {
      return res.status(400).json({ error: "كلمتا المرور غير متطابقتين" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "يجب ألا تقل كلمة المرور عن 6 أحرف أو أرقام" });
    }

    const existingCode = await db.execute({
      sql: "SELECT id FROM users WHERE student_code = ?",
      args: [student_code.trim()]
    });

    if (existingCode.rows.length > 0) {
      return res.status(400).json({ error: "الكود مسجل بالفعل لمستخدم آخر" });
    }

    const id = crypto.randomUUID();
    const password_hash = await hashPassword(password);
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO users (id, full_name, phone, student_code, password_hash, year_id, specialization_id, role, is_active, created_at, last_seen)
            VALUES (?, ?, ?, ?, ?, 'admin', NULL, 'admin', 1, ?, ?)`,
      args: [id, full_name.trim(), phone.trim(), student_code.trim(), password_hash, now, now]
    });

    const userPayload = {
      id,
      full_name: full_name.trim(),
      phone: phone.trim(),
      student_code: student_code.trim(),
      year_id: "admin",
      specialization_id: null,
      role: "admin" as const,
    };

    const token = generateToken(userPayload);
    res.cookie("token", token, { httpOnly: true, sameSite: "lax", maxAge: 7 * 86400 * 1000 });

    res.status(201).json({
      message: "تم إنشاء حساب المسؤول بنجاح",
      token,
      user: userPayload
    });
  } catch (err: any) {
    console.error("Admin setup error:", err);
    res.status(500).json({ error: "حدث خطأ أثناء إعداد حساب المسؤول" });
  }
});

// Student Registration
authRouter.post("/register", async (req, res) => {
  try {
    const { full_name, phone, student_code, password, confirm_password, year_id, specialization_id } = req.body;

    if (!full_name || !phone || !student_code || !password || !year_id) {
      return res.status(400).json({ error: "يرجى تعبئة كافة الحقول المطلوبة" });
    }

    if (password !== confirm_password) {
      return res.status(400).json({ error: "كلمتا المرور غير متطابقتين" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "يجب ألا تقل كلمة المرور عن 6 خانات" });
    }

    // Student code validation: exactly 8 digits, starts with 20
    const codeClean = String(student_code).trim();
    const codeRegex = /^20\d{6}$/;
    if (!codeRegex.test(codeClean)) {
      return res.status(400).json({
        error: "كود الطالب يجب أن يكون 8 أرقام ويبدأ بـ 20 (مثال: 20240101)"
      });
    }

    // Specialization validation
    if (year_id !== "prep" && !specialization_id) {
      return res.status(400).json({ error: "يرجى اختيار التخصص الدراسي للفرقة المحددة" });
    }

    const finalSpecId = year_id === "prep" ? null : specialization_id;

    // Check uniqueness
    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE student_code = ?",
      args: [codeClean]
    });

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "كود الطالب مسجل مسبقاً، يرجى تسجيل الدخول" });
    }

    const id = crypto.randomUUID();
    const password_hash = await hashPassword(password);
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO users (id, full_name, phone, student_code, password_hash, year_id, specialization_id, role, is_active, created_at, last_seen)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'student', 1, ?, ?)`,
      args: [id, full_name.trim(), phone.trim(), codeClean, password_hash, year_id, finalSpecId, now, now]
    });

    const userPayload = {
      id,
      full_name: full_name.trim(),
      phone: phone.trim(),
      student_code: codeClean,
      year_id,
      specialization_id: finalSpecId,
      role: "student" as const,
    };

    const token = generateToken(userPayload);
    res.cookie("token", token, { httpOnly: true, sameSite: "lax", maxAge: 7 * 86400 * 1000 });

    res.status(201).json({
      message: "تم إنشاء الحساب بنجاح",
      token,
      user: userPayload
    });
  } catch (err: any) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "حدث خطأ أثناء إنشاء الحساب، يرجى المحاولة لاحقاً" });
  }
});

// Login (Student or Admin by code + password)
authRouter.post("/login", async (req, res) => {
  try {
    const { student_code, password } = req.body;

    if (!student_code || !password) {
      return res.status(400).json({ error: "يرجى إدخال كود الطالب وكلمة المرور" });
    }

    const codeClean = String(student_code).trim();

    const result = await db.execute({
      sql: "SELECT id, full_name, phone, student_code, password_hash, year_id, specialization_id, role, is_active FROM users WHERE student_code = ?",
      args: [codeClean]
    });

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "كود الطالب أو كلمة المرور غير صحيحة" });
    }

    const userRow = result.rows[0];

    if (userRow.is_active === 0) {
      return res.status(403).json({ error: "تم تعطيل هذا الحساب. يرجى مراجعة إدارة المنصة" });
    }

    const passwordMatch = await comparePassword(password, String(userRow.password_hash));
    if (!passwordMatch) {
      return res.status(400).json({ error: "كود الطالب أو كلمة المرور غير صحيحة" });
    }

    // Update last_seen
    const now = new Date().toISOString();
    await db.execute({
      sql: "UPDATE users SET last_seen = ? WHERE id = ?",
      args: [now, userRow.id]
    });

    const userPayload = {
      id: String(userRow.id),
      full_name: String(userRow.full_name),
      phone: String(userRow.phone),
      student_code: String(userRow.student_code),
      year_id: String(userRow.year_id),
      specialization_id: userRow.specialization_id ? String(userRow.specialization_id) : null,
      role: String(userRow.role) as "student" | "admin",
    };

    const token = generateToken(userPayload);
    res.cookie("token", token, { httpOnly: true, sameSite: "lax", maxAge: 7 * 86400 * 1000 });

    res.json({
      message: "تم تسجيل الدخول بنجاح",
      token,
      user: userPayload
    });
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json({ error: "حدث خطأ أثناء تسجيل الدخول" });
  }
});

// Current User Info
authRouter.get("/me", async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.json({ user: null });
  }

  try {
    const result = await db.execute({
      sql: `SELECT u.id, u.full_name, u.phone, u.student_code, u.year_id, u.specialization_id, u.role, u.created_at,
                   y.name as year_name, s.name as spec_name
            FROM users u
            LEFT JOIN years y ON u.year_id = y.id
            LEFT JOIN specializations s ON u.specialization_id = s.id
            WHERE u.id = ?`,
      args: [req.user.id]
    });

    if (result.rows.length === 0) {
      return res.json({ user: null });
    }

    const row = result.rows[0];
    res.json({
      user: {
        id: row.id,
        full_name: row.full_name,
        phone: row.phone,
        student_code: row.student_code,
        year_id: row.year_id,
        year_name: row.year_name,
        specialization_id: row.specialization_id,
        spec_name: row.spec_name,
        role: row.role,
        created_at: row.created_at
      }
    });
  } catch (err) {
    res.status(500).json({ error: "فشل جلب بيانات المستخدم" });
  }
});

// Heartbeat ping (called periodically by front-end to keep last_seen updated)
authRouter.post("/heartbeat", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date().toISOString();
    await db.execute({
      sql: "UPDATE users SET last_seen = ? WHERE id = ?",
      args: [now, req.user!.id]
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false });
  }
});

// Progress & Quiz Leaderboard Ranking
authRouter.get("/progress", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = req.user!.id;

    // 1. Total students count
    const totalStudentsRes = await db.execute("SELECT COUNT(*) as c FROM users WHERE role = 'student'");
    const totalStudents = Math.max(1, Number(totalStudentsRes.rows[0].c));

    // 2. Total published quizzes count and total max score possible
    const quizzesRes = await db.execute("SELECT COUNT(*) as count, COALESCE(SUM(total_points), 0) as max_points FROM quizzes WHERE is_published = 1");
    const totalQuizzes = Number(quizzesRes.rows[0].count);
    const maxPossiblePoints = Number(quizzesRes.rows[0].max_points);

    // 3. Compute rankings: sum of best scores per quiz for all users
    const scoresRes = await db.execute(`
      SELECT u.id as user_id,
             COALESCE(SUM(sub.best_score), 0) as total_points,
             COUNT(sub.quiz_id) as completed_quizzes,
             AVG(sub.best_score) as avg_score
      FROM users u
      LEFT JOIN (
        SELECT user_id, quiz_id, MAX(score) as best_score
        FROM quiz_attempts
        WHERE status != 'in_progress'
        GROUP BY user_id, quiz_id
      ) sub ON u.id = sub.user_id
      WHERE u.role = 'student'
      GROUP BY u.id
      ORDER BY total_points DESC, completed_quizzes DESC, u.created_at ASC
    `);

    let rank = 1;
    let currentUserStats = {
      totalPoints: 0,
      completedQuizzes: 0,
      avgScore: 0,
    };

    const rows = scoresRes.rows;
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i].user_id) === currentUserId) {
        rank = i + 1;
        currentUserStats = {
          totalPoints: Math.round(Number(rows[i].total_points || 0)),
          completedQuizzes: Number(rows[i].completed_quizzes || 0),
          avgScore: Math.round(Number(rows[i].avg_score || 0)),
        };
        break;
      }
    }

    const completionRate = totalQuizzes > 0
      ? Math.round((currentUserStats.completedQuizzes / totalQuizzes) * 100)
      : 0;

    res.json({
      rank,
      totalStudents,
      totalPoints: currentUserStats.totalPoints,
      completedQuizzes: currentUserStats.completedQuizzes,
      totalQuizzes,
      completionRate,
      maxPossiblePoints,
    });
  } catch (err: any) {
    console.error("Progress error:", err);
    res.status(500).json({ error: "فشل استرجاع بيانات التقدم والترتيب" });
  }
});

// Change Password
authRouter.put("/password", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { current_password, new_password, confirm_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: "يرجى تعبئة كافة الحقول" });
    }

    if (new_password !== confirm_password) {
      return res.status(400).json({ error: "كلمتا المرور الجديدتان غير متطابقتين" });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: "كلمة المرور الجديدة يجب أن تكون 6 أحرف أو أرقام على الأقل" });
    }

    const userRes = await db.execute({
      sql: "SELECT password_hash FROM users WHERE id = ?",
      args: [req.user!.id]
    });

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: "المستخدم غير موجود" });
    }

    const match = await comparePassword(current_password, String(userRes.rows[0].password_hash));
    if (!match) {
      return res.status(400).json({ error: "كلمة المرور الحالية غير صحيحة" });
    }

    const newHash = await hashPassword(new_password);
    await db.execute({
      sql: "UPDATE users SET password_hash = ? WHERE id = ?",
      args: [newHash, req.user!.id]
    });

    res.json({ message: "تم تغيير كلمة المرور بنجاح" });
  } catch (err: any) {
    res.status(500).json({ error: "حدث خطأ أثناء تغيير كلمة المرور" });
  }
});

// Logout
authRouter.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "تم تسجيل الخروج بنجاح" });
});
