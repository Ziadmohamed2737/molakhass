import { Router } from "express";
import crypto from "crypto";
import { db } from "../db";
import { AuthRequest, requireAuth, requireAdmin } from "../auth";

export const subjectsRouter = Router();

// List subjects
subjectsRouter.get("/", async (req: AuthRequest, res) => {
  try {
    const { year_id, specialization_id, term_id, all } = req.query;
    const user = req.user;

    let whereClauses: string[] = [];
    let args: any[] = [];

    // If regular student and 'all' is not requested by admin
    if (user && user.role === "student" && !all) {
      whereClauses.push("s.is_active = 1");
      whereClauses.push("s.year_id = ?");
      args.push(user.year_id);

      if (user.year_id === "prep") {
        whereClauses.push("s.specialization_id IS NULL");
      } else if (user.specialization_id) {
        whereClauses.push("(s.specialization_id = ? OR s.specialization_id IS NULL)");
        args.push(user.specialization_id);
      }
    } else {
      // Admin or specific query filter
      if (year_id) {
        whereClauses.push("s.year_id = ?");
        args.push(year_id);
      }
      if (specialization_id) {
        whereClauses.push("s.specialization_id = ?");
        args.push(specialization_id);
      }
      if (!user || user.role !== "admin") {
        whereClauses.push("s.is_active = 1");
      }
    }

    if (term_id) {
      whereClauses.push("s.term_id = ?");
      args.push(term_id);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const userParam = user ? user.id : "";
    const query = `
      SELECT s.id, s.name, s.code, s.doctor_name, s.year_id, s.specialization_id, s.term_id, s.is_active, s.created_at,
             y.name as year_name, sp.name as spec_name, t.name as term_name,
             (SELECT COUNT(*) FROM lectures l WHERE l.subject_id = s.id AND l.is_published = 1) as lectures_count,
             (SELECT COUNT(*) FROM sections sc WHERE sc.subject_id = s.id AND sc.is_published = 1) as sections_count,
             (SELECT COUNT(*) FROM sheets sh WHERE sh.subject_id = s.id AND sh.is_published = 1) as sheets_count,
             (SELECT COUNT(*) FROM quizzes q WHERE q.subject_id = s.id AND q.is_published = 1) as quizzes_count,
             ${user ? `CASE WHEN sf.user_id IS NOT NULL THEN 1 ELSE 0 END` : `0`} as is_favorite
      FROM subjects s
      LEFT JOIN years y ON s.year_id = y.id
      LEFT JOIN specializations sp ON s.specialization_id = sp.id
      LEFT JOIN terms t ON s.term_id = t.id
      ${user ? `LEFT JOIN student_favorites sf ON sf.subject_id = s.id AND sf.user_id = ?` : ""}
      ${whereSql}
      ORDER BY ${user ? `is_favorite DESC, sf.created_at DESC, ` : ""}s.created_at DESC
    `;

    const finalArgs = user ? [userParam, ...args] : args;
    const result = await db.execute({ sql: query, args: finalArgs });
    res.json({ subjects: result.rows });
  } catch (err: any) {
    console.error("Fetch subjects error:", err);
    res.status(500).json({ error: "فشل استرجاع قائمة المواد" });
  }
});

// Toggle favorite for current student (Max 3 subjects)
subjectsRouter.post("/:id/favorite", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check if subject exists
    const subjectRes = await db.execute({
      sql: "SELECT id, name FROM subjects WHERE id = ?",
      args: [id]
    });
    if (subjectRes.rows.length === 0) {
      return res.status(404).json({ error: "المادة غير موجودة" });
    }

    // Check if already favorited
    const existing = await db.execute({
      sql: "SELECT 1 FROM student_favorites WHERE user_id = ? AND subject_id = ?",
      args: [userId, id]
    });

    if (existing.rows.length > 0) {
      // Remove from favorites
      await db.execute({
        sql: "DELETE FROM student_favorites WHERE user_id = ? AND subject_id = ?",
        args: [userId, id]
      });

      const countRes = await db.execute({
        sql: "SELECT COUNT(*) as c FROM student_favorites WHERE user_id = ?",
        args: [userId]
      });

      return res.json({
        is_favorite: 0,
        favorite_count: Number(countRes.rows[0].c),
        message: "تمت إزالة المادة من المفضلة"
      });
    } else {
      // Check current count
      const countRes = await db.execute({
        sql: "SELECT COUNT(*) as c FROM student_favorites WHERE user_id = ?",
        args: [userId]
      });
      const currentCount = Number(countRes.rows[0].c);

      if (currentCount >= 3) {
        return res.status(400).json({
          error: "الحد الأقصى للمواد المفضلة هو 3 مواد فقط. يمكنك إزالة مادة أولاً لتفضيل غيرها.",
          favorite_count: currentCount
        });
      }

      const now = new Date().toISOString();
      await db.execute({
        sql: "INSERT INTO student_favorites (user_id, subject_id, created_at) VALUES (?, ?, ?)",
        args: [userId, id, now]
      });

      return res.json({
        is_favorite: 1,
        favorite_count: currentCount + 1,
        message: "تمت إضافة المادة إلى المفضلة وستظهر في أول الترتيب دائماً"
      });
    }
  } catch (err: any) {
    console.error("Favorite toggle error:", err);
    res.status(500).json({ error: "فشل تعديل حالة المفضلة" });
  }
});

// Get single subject details
subjectsRouter.get("/:id", async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const query = `
      SELECT s.id, s.name, s.code, s.doctor_name, s.year_id, s.specialization_id, s.term_id, s.is_active, s.created_at,
             y.name as year_name, sp.name as spec_name, t.name as term_name,
             (SELECT COUNT(*) FROM lectures l WHERE l.subject_id = s.id AND l.is_published = 1) as lectures_count,
             (SELECT COUNT(*) FROM sections sc WHERE sc.subject_id = s.id AND sc.is_published = 1) as sections_count,
             (SELECT COUNT(*) FROM sheets sh WHERE sh.subject_id = s.id AND sh.is_published = 1) as sheets_count,
             (SELECT COUNT(*) FROM quizzes q WHERE q.subject_id = s.id AND q.is_published = 1) as quizzes_count,
             ${user ? `CASE WHEN sf.user_id IS NOT NULL THEN 1 ELSE 0 END` : `0`} as is_favorite
      FROM subjects s
      LEFT JOIN years y ON s.year_id = y.id
      LEFT JOIN specializations sp ON s.specialization_id = sp.id
      LEFT JOIN terms t ON s.term_id = t.id
      ${user ? `LEFT JOIN student_favorites sf ON sf.subject_id = s.id AND sf.user_id = ?` : ""}
      WHERE s.id = ?
    `;

    const args = user ? [user.id, id] : [id];
    const result = await db.execute({ sql: query, args });
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "المادة غير موجودة" });
    }

    res.json({ subject: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: "فشل جلب تفاصيل المادة" });
  }
});

// Admin: Create Subject
subjectsRouter.post("/", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, code, doctor_name, year_id, specialization_id, term_id } = req.body;

    if (!name || !code || !doctor_name || !year_id || !term_id) {
      return res.status(400).json({ error: "يرجى تعبئة كافة الحقول المطلوبة للمادة" });
    }

    const finalSpecId = year_id === "prep" ? null : (specialization_id || null);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO subjects (id, name, code, doctor_name, year_id, specialization_id, term_id, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      args: [id, name.trim(), code.trim(), doctor_name.trim(), year_id, finalSpecId, term_id, now]
    });

    res.status(201).json({ message: "تمت إضافة المادة بنجاح", subjectId: id });
  } catch (err: any) {
    console.error("Create subject error:", err);
    res.status(500).json({ error: "حدث خطأ أثناء إضافة المادة" });
  }
});

// Admin: Update Subject
subjectsRouter.put("/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, code, doctor_name, year_id, specialization_id, term_id, is_active } = req.body;

    if (!name || !code || !doctor_name || !year_id || !term_id) {
      return res.status(400).json({ error: "يرجى تعبئة كافة الحقول المطلوبة" });
    }

    const finalSpecId = year_id === "prep" ? null : (specialization_id || null);

    await db.execute({
      sql: `UPDATE subjects SET name = ?, code = ?, doctor_name = ?, year_id = ?, specialization_id = ?, term_id = ?, is_active = ?
            WHERE id = ?`,
      args: [name.trim(), code.trim(), doctor_name.trim(), year_id, finalSpecId, term_id, is_active !== undefined ? is_active : 1, id]
    });

    res.json({ message: "تم تعديل المادة بنجاح" });
  } catch (err: any) {
    res.status(500).json({ error: "حدث خطأ أثناء تعديل المادة" });
  }
});

// Admin: Toggle active state
subjectsRouter.patch("/:id/toggle", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const current = await db.execute({ sql: "SELECT is_active FROM subjects WHERE id = ?", args: [id] });
    if (current.rows.length === 0) {
      return res.status(404).json({ error: "المادة غير موجودة" });
    }

    const newStatus = Number(current.rows[0].is_active) === 1 ? 0 : 1;
    await db.execute({ sql: "UPDATE subjects SET is_active = ? WHERE id = ?", args: [newStatus, id] });

    res.json({ message: "تم تغيير حالة المادة", is_active: newStatus });
  } catch (err: any) {
    res.status(500).json({ error: "فشل تغيير حالة المادة" });
  }
});

// Admin: Delete Subject
subjectsRouter.delete("/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await db.batch([
      { sql: "DELETE FROM documents WHERE subject_id = ?", args: [id] },
      { sql: "DELETE FROM lectures WHERE subject_id = ?", args: [id] },
      { sql: "DELETE FROM sections WHERE subject_id = ?", args: [id] },
      { sql: "DELETE FROM sheets WHERE subject_id = ?", args: [id] },
      { sql: "DELETE FROM quizzes WHERE subject_id = ?", args: [id] },
      { sql: "DELETE FROM student_favorites WHERE subject_id = ?", args: [id] },
      { sql: "DELETE FROM subjects WHERE id = ?", args: [id] }
    ], "write");

    res.json({ message: "تم حذف المادة وجميع متعلقاتها بنجاح" });
  } catch (err: any) {
    res.status(500).json({ error: "حدث خطأ أثناء حذف المادة" });
  }
});
