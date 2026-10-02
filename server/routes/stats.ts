import { Router } from "express";
import { db } from "../db";

export const statsRouter = Router();

statsRouter.get("/", async (req, res) => {
  try {
    // 5 minutes ago in ISO format
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const [
      totalUsersRes,
      activeUsersRes,
      totalFilesRes,
      totalSubjectsRes,
      totalLecturesRes,
      totalSectionsRes,
      totalSheetsRes,
      totalQuizzesRes
    ] = await Promise.all([
      db.execute("SELECT COUNT(*) as c FROM users WHERE role = 'student' OR role = 'admin'"),
      db.execute({
        sql: "SELECT COUNT(*) as c FROM users WHERE last_seen >= ?",
        args: [fiveMinutesAgo]
      }),
      db.execute("SELECT COUNT(*) as c FROM documents WHERE is_published = 1"),
      db.execute("SELECT COUNT(*) as c FROM subjects WHERE is_active = 1"),
      db.execute("SELECT COUNT(*) as c FROM lectures WHERE is_published = 1"),
      db.execute("SELECT COUNT(*) as c FROM sections WHERE is_published = 1"),
      db.execute("SELECT COUNT(*) as c FROM sheets WHERE is_published = 1"),
      db.execute("SELECT COUNT(*) as c FROM quizzes WHERE is_published = 1"),
    ]);

    const totalUsers = Number(totalUsersRes.rows[0].c);
    const activeUsers = Number(activeUsersRes.rows[0].c);
    const totalFiles = Number(totalFilesRes.rows[0].c);
    const totalSubjects = Number(totalSubjectsRes.rows[0].c);
    const totalLectures = Number(totalLecturesRes.rows[0].c);
    const totalSections = Number(totalSectionsRes.rows[0].c);
    const totalSheets = Number(totalSheetsRes.rows[0].c);
    const totalQuizzes = Number(totalQuizzesRes.rows[0].c);

    res.json({
      totalUsers,
      activeUsers,
      totalFiles,
      totalSubjects,
      totalLectures,
      totalSections,
      totalSheets,
      totalQuizzes
    });
  } catch (err: any) {
    console.error("Stats error:", err);
    res.status(500).json({ error: "فشل استرجاع الإحصائيات" });
  }
});
