import { Router, Response } from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { db } from "../db";
import { AuthRequest, requireAdmin, hashPassword } from "../auth";

export const adminRouter = Router();

// Deep Dashboard Stats for Admin
adminRouter.get("/dashboard-stats", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const [
      totalUsersRes,
      activeUsersRes,
      totalFilesRes,
      totalSubjectsRes,
      totalLecturesRes,
      totalSectionsRes,
      totalSheetsRes,
      totalQuizzesRes,
      recentUsersRes,
      recentAttemptsRes
    ] = await Promise.all([
      db.execute("SELECT COUNT(*) as c FROM users WHERE role = 'student' OR role = 'admin'"),
      db.execute({ sql: "SELECT COUNT(*) as c FROM users WHERE last_seen >= ?", args: [fiveMinutesAgo] }),
      db.execute("SELECT COUNT(*) as c FROM documents WHERE is_published = 1"),
      db.execute("SELECT COUNT(*) as c FROM subjects WHERE is_active = 1"),
      db.execute("SELECT COUNT(*) as c FROM lectures WHERE is_published = 1"),
      db.execute("SELECT COUNT(*) as c FROM sections WHERE is_published = 1"),
      db.execute("SELECT COUNT(*) as c FROM sheets WHERE is_published = 1"),
      db.execute("SELECT COUNT(*) as c FROM quizzes WHERE is_published = 1"),
      db.execute(`
        SELECT u.id, u.full_name, u.student_code, u.phone, u.role, u.is_active, u.created_at, u.last_seen,
               y.name as year_name, sp.name as spec_name
        FROM users u
        LEFT JOIN years y ON u.year_id = y.id
        LEFT JOIN specializations sp ON u.specialization_id = sp.id
        ORDER BY u.created_at DESC
        LIMIT 5
      `),
      db.execute(`
        SELECT qa.id, qa.score, qa.percentage, qa.submitted_at, qa.status,
               u.full_name as student_name, u.student_code,
               q.title as quiz_title, s.name as subject_name
        FROM quiz_attempts qa
        JOIN users u ON qa.user_id = u.id
        JOIN quizzes q ON qa.quiz_id = q.id
        JOIN subjects s ON q.subject_id = s.id
        WHERE qa.status != 'in_progress'
        ORDER BY qa.submitted_at DESC
        LIMIT 5
      `)
    ]);

    res.json({
      counts: {
        totalUsers: Number(totalUsersRes.rows[0].c),
        activeUsers: Number(activeUsersRes.rows[0].c),
        totalFiles: Number(totalFilesRes.rows[0].c),
        totalSubjects: Number(totalSubjectsRes.rows[0].c),
        totalLectures: Number(totalLecturesRes.rows[0].c),
        totalSections: Number(totalSectionsRes.rows[0].c),
        totalSheets: Number(totalSheetsRes.rows[0].c),
        totalQuizzes: Number(totalQuizzesRes.rows[0].c),
      },
      recentUsers: recentUsersRes.rows,
      recentAttempts: recentAttemptsRes.rows,
    });
  } catch (err: any) {
    console.error("Admin dashboard stats error:", err);
    res.status(500).json({ error: "فشل تحميل إحصائيات لوحة التحكم" });
  }
});

// List users with search and filtering
adminRouter.get("/users", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { search, year_id, specialization_id, role, page = "1", limit = "20" } = req.query;

    let whereClauses: string[] = [];
    let args: any[] = [];

    if (search) {
      const term = `%${String(search).trim()}%`;
      whereClauses.push("(u.full_name LIKE ? OR u.student_code LIKE ? OR u.phone LIKE ?)");
      args.push(term, term, term);
    }

    if (year_id) {
      whereClauses.push("u.year_id = ?");
      args.push(year_id);
    }

    if (specialization_id) {
      whereClauses.push("u.specialization_id = ?");
      args.push(specialization_id);
    }

    if (role) {
      whereClauses.push("u.role = ?");
      args.push(role);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const countRes = await db.execute({
      sql: `SELECT COUNT(*) as c FROM users u ${whereSql}`,
      args
    });
    const totalCount = Number(countRes.rows[0].c);

    const usersRes = await db.execute({
      sql: `
        SELECT u.id, u.full_name, u.phone, u.student_code, u.year_id, u.specialization_id, u.role, u.is_active, u.created_at, u.last_seen,
               y.name as year_name, sp.name as spec_name
        FROM users u
        LEFT JOIN years y ON u.year_id = y.id
        LEFT JOIN specializations sp ON u.specialization_id = sp.id
        ${whereSql}
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?
      `,
      args: [...args, limitNum, offset]
    });

    res.json({
      users: usersRes.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (err: any) {
    console.error("List users error:", err);
    res.status(500).json({ error: "فشل استرجاع قائمة المستخدمين" });
  }
});

// Toggle user active status (Enable / Disable)
adminRouter.patch("/users/:id/status", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (id === req.user!.id) {
      return res.status(400).json({ error: "لا يمكنك تعطيل حسابك الخاص" });
    }

    await db.execute({
      sql: "UPDATE users SET is_active = ? WHERE id = ?",
      args: [is_active ? 1 : 0, id]
    });

    res.json({ message: is_active ? "تم تفعيل الحساب بنجاح" : "تم تعطيل الحساب بنجاح" });
  } catch (err: any) {
    res.status(500).json({ error: "فشل تعديل حالة الحساب" });
  }
});

// Edit user data
adminRouter.put("/users/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone, year_id, specialization_id, role } = req.body;

    if (!full_name || !phone || !year_id) {
      return res.status(400).json({ error: "الاسم ورقم الهاتف والفرقة حقول مطلوبة" });
    }

    const finalSpec = year_id === "prep" ? null : (specialization_id || null);

    await db.execute({
      sql: `UPDATE users SET
              full_name = ?,
              phone = ?,
              year_id = ?,
              specialization_id = ?,
              role = COALESCE(?, role)
            WHERE id = ?`,
      args: [full_name.trim(), phone.trim(), year_id, finalSpec, role || null, id]
    });

    res.json({ message: "تم تحديث بيانات المستخدم بنجاح" });
  } catch (err: any) {
    res.status(500).json({ error: "فشل تحديث بيانات المستخدم" });
  }
});

// Create a supervisor (moderator) account - Super Admin only
adminRouter.post("/moderators", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { full_name, phone, student_code, password } = req.body;

    if (!full_name || !phone || !student_code || !password) {
      return res.status(400).json({ error: "الاسم، رقم الهاتف، كود الدخول، وكلمة المرور مطلوبة" });
    }

    if (String(password).length < 4) {
      return res.status(400).json({ error: "كلمة المرور يجب ألا تقل عن 4 خانات" });
    }

    const code = String(student_code).trim();
    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE student_code = ?",
      args: [code]
    });

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "هذا الكود مستخدم بالفعل لمستخدم آخر" });
    }

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(String(password).trim());
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO users (
        id, full_name, phone, student_code, password_hash, year_id, specialization_id, role, is_active, created_at, last_seen
      ) VALUES (?, ?, ?, ?, ?, 'fourth', null, 'moderator', 1, ?, ?)`,
      args: [id, full_name.trim(), phone.trim(), code, passwordHash, now, now]
    });

    res.status(201).json({
      message: "تم إنشاء حساب مشرف المحتوى بنجاح",
      user: {
        id,
        full_name: full_name.trim(),
        phone: phone.trim(),
        student_code: code,
        role: "moderator",
        is_active: 1
      }
    });
  } catch (err: any) {
    console.error("Create moderator error:", err);
    res.status(500).json({ error: "فشل إنشاء حساب المشرف" });
  }
});

// Permanently delete user account
adminRouter.delete("/users/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    if (id === req.user!.id) {
      return res.status(400).json({ error: "لا يمكنك حذف حساب الإدارة الخاص بك" });
    }

    // Check if target user is primary admin (20250000)
    const checkTarget = await db.execute({
      sql: "SELECT student_code FROM users WHERE id = ?",
      args: [id]
    });
    if (checkTarget.rows.length > 0 && checkTarget.rows[0].student_code === "20250000") {
      return res.status(400).json({ error: "لا يمكن حذف حساب المدير الأساسي للمنصة" });
    }

    // Cascade delete user's answers, attempts, favorites, and user row
    await db.batch([
      {
        sql: "DELETE FROM quiz_answers WHERE attempt_id IN (SELECT id FROM quiz_attempts WHERE user_id = ?)",
        args: [id]
      },
      {
        sql: "DELETE FROM quiz_attempts WHERE user_id = ?",
        args: [id]
      },
      {
        sql: "DELETE FROM student_favorites WHERE user_id = ?",
        args: [id]
      },
      {
        sql: "DELETE FROM users WHERE id = ?",
        args: [id]
      }
    ], "write");

    res.json({ message: "تم حذف حساب المستخدم نهائياً من قاعدة البيانات" });
  } catch (err: any) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: "فشل حذف حساب المستخدم نهائياً" });
  }
});

// Full platform data reset (Super Admin only)
adminRouter.post("/reset-database", requireAdmin, async (req: AuthRequest, res) => {
  try {
    // 1. Delete all academic content and submissions
    await db.batch([
      "DELETE FROM quiz_answers;",
      "DELETE FROM quiz_attempts;",
      "DELETE FROM student_favorites;",
      "DELETE FROM options;",
      "DELETE FROM questions;",
      "DELETE FROM quizzes;",
      "DELETE FROM documents;",
      "DELETE FROM sheets;",
      "DELETE FROM sections;",
      "DELETE FROM lectures;",
      "DELETE FROM subjects;",
      "DELETE FROM users WHERE student_code != '20250000';"
    ], "write");

    // 2. Remove all uploaded files
    const uploadsDir = path.resolve(process.cwd(), "uploads");
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const f of files) {
        const p = path.join(uploadsDir, f);
        try {
          if (fs.lstatSync(p).isDirectory()) {
            fs.rmSync(p, { recursive: true, force: true });
          } else {
            fs.unlinkSync(p);
          }
        } catch (_) {}
      }
    }

    res.json({ message: "تم تصفير وحذف جميع البيانات بنجاح، المنصة الآن فارغة وجديدة بالكامل" });
  } catch (err: any) {
    console.error("Reset database error:", err);
    res.status(500).json({ error: "فشل تصفير بيانات المنصة" });
  }
});
