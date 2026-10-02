import { Router, Response } from "express";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { db } from "../db";
import { upload, getSafeFilePath } from "../storage";
import { AuthRequest, requireAuth, requireAdmin, requireContentManager } from "../auth";

export const quizzesRouter = Router();

// Upload image for question or option
quizzesRouter.post("/upload-media", requireAdmin, upload.single("image"), async (req: AuthRequest, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "لم يتم اختيار صورة" });
    }

    // Relative web URL for uploaded media
    const relativeUrl = `/api/quizzes/media/${file.filename}`;
    res.json({
      url: relativeUrl,
      filename: file.filename
    });
  } catch (err: any) {
    res.status(500).json({ error: "فشل رفع الصورة" });
  }
});

// Serve quiz media images safely
quizzesRouter.get("/media/:filename", (req, res) => {
  const baseUploadDir = path.resolve(process.cwd(), "uploads");
  const filename = path.basename(req.params.filename);

  // Search in subjects/general/documents or recursively in uploads
  function findFile(dir: string): string | null {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        const found = findFile(full);
        if (found) return found;
      } else if (f === filename) {
        return full;
      }
    }
    return null;
  }

  const filePath = findFile(baseUploadDir);
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).send("الصورة غير موجودة");
  }

  res.sendFile(filePath);
});

// List quizzes for a subject
quizzesRouter.get("/subjects/:subjectId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { subjectId } = req.params;
    const user = req.user!;
    const isStaff = user.role === "admin" || user.role === "moderator";
    const filterPublished = !isStaff ? "AND q.is_published = 1" : "";
    const creatorSelect = isStaff
      ? "u.full_name as creator_name, u.student_code as creator_code, u.role as creator_role, q.created_by,"
      : "NULL as creator_name, NULL as creator_code, NULL as creator_role, NULL as created_by,";

    const query = `
      SELECT q.id, q.subject_id, q.title, q.description, q.duration_seconds,
             COALESCE((SELECT SUM(qu.points) FROM questions qu WHERE qu.quiz_id = q.id), q.total_points) as total_points,
             q.max_attempts, q.show_answers, q.allow_back_navigation, q.is_published, q.created_at,
             ${creatorSelect}
             (SELECT COUNT(*) FROM questions qu WHERE qu.quiz_id = q.id) as questions_count,
             (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.user_id = ? AND qa.status != 'in_progress') as user_attempts_count,
             (SELECT MAX(qa.score) FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.user_id = ? AND qa.status != 'in_progress') as best_score
      FROM quizzes q
      LEFT JOIN users u ON q.created_by = u.id
      WHERE q.subject_id = ? ${filterPublished}
      ORDER BY q.created_at DESC
    `;

    const result = await db.execute({ sql: query, args: [user.id, user.id, subjectId] });
    res.json({ quizzes: result.rows });
  } catch (err: any) {
    console.error("List quizzes error:", err);
    res.status(500).json({ error: "فشل استرجاع قائمة الكويزات" });
  }
});

// Get single quiz details (for student to take or view info, or admin to edit)
quizzesRouter.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const quizRes = await db.execute({
      sql: `SELECT q.*,
                   COALESCE((SELECT SUM(qu.points) FROM questions qu WHERE qu.quiz_id = q.id), q.total_points) as total_points,
                   s.name as subject_name, s.code as subject_code
            FROM quizzes q
            JOIN subjects s ON q.subject_id = s.id
            WHERE q.id = ?`,
      args: [id]
    });

    if (quizRes.rows.length === 0) {
      return res.status(404).json({ error: "الكويز غير موجود" });
    }

    const quiz = quizRes.rows[0];
    if (quiz.is_published === 0 && user.role !== "admin") {
      return res.status(403).json({ error: "هذا الكويز غير منشور حالياً" });
    }

    // Fetch questions
    const questionsRes = await db.execute({
      sql: `SELECT id, quiz_id, question_number, question_text, question_image, points
            ${user.role === "admin" ? ", correct_option" : ""}
            FROM questions
            WHERE quiz_id = ?
            ORDER BY question_number ASC`,
      args: [id]
    });

    // Fetch options for questions
    const questionIds = questionsRes.rows.map(q => q.id);
    let optionsByQuestion: Record<string, any[]> = {};

    if (questionIds.length > 0) {
      const placeholders = questionIds.map(() => "?").join(",");
      const optionsRes = await db.execute({
        sql: `SELECT id, question_id, option_key, option_text, option_image
              FROM options
              WHERE question_id IN (${placeholders})
              ORDER BY option_key ASC`,
        args: questionIds
      });

      optionsRes.rows.forEach(opt => {
        const qId = String(opt.question_id);
        if (!optionsByQuestion[qId]) optionsByQuestion[qId] = [];
        optionsByQuestion[qId].push(opt);
      });
    }

    const questions = questionsRes.rows.map(q => ({
      ...q,
      options: optionsByQuestion[String(q.id)] || []
    }));

    // Check user attempts
    const attemptsRes = await db.execute({
      sql: `SELECT id, started_at, submitted_at, score, percentage, status
            FROM quiz_attempts
            WHERE quiz_id = ? AND user_id = ?
            ORDER BY started_at DESC`,
      args: [id, user.id]
    });

    res.json({
      quiz,
      questions,
      userAttempts: attemptsRes.rows
    });
  } catch (err: any) {
    console.error("Get quiz error:", err);
    res.status(500).json({ error: "فشل تحميل تفاصيل الكويز" });
  }
});

// Staff: Create quiz
quizzesRouter.post("/", requireContentManager, async (req: AuthRequest, res) => {
  try {
    const {
      subject_id,
      title,
      description,
      duration_seconds,
      total_points,
      max_attempts,
      show_answers,
      allow_back_navigation,
      is_published
    } = req.body;

    if (!subject_id || !title) {
      return res.status(400).json({ error: "اسم الكويز والمادة حقول مطلوبة" });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const creatorId = req.user?.id || null;

    await db.execute({
      sql: `INSERT INTO quizzes (
              id, subject_id, title, description, duration_seconds, total_points,
              max_attempts, show_answers, allow_back_navigation, is_published, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        subject_id,
        title.trim(),
        description ? description.trim() : null,
        parseInt(duration_seconds, 10) || 600,
        Math.max(1, Math.round(Number(total_points)) || 100),
        parseInt(max_attempts, 10) || 1,
        show_answers !== undefined ? show_answers : 1,
        allow_back_navigation !== undefined ? allow_back_navigation : 1,
        is_published !== undefined ? is_published : 0,
        creatorId,
        now
      ]
    });

    res.status(201).json({ message: "تم إنشاء الكويز بنجاح", quizId: id });
  } catch (err: any) {
    console.error("Create quiz error:", err);
    res.status(500).json({ error: "فشل إنشاء الكويز" });
  }
});

// Admin: Update quiz details
quizzesRouter.put("/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      duration_seconds,
      total_points,
      max_attempts,
      show_answers,
      allow_back_navigation,
      is_published
    } = req.body;

    // If publishing, validate questions
    if (is_published === 1) {
      const questions = await db.execute({
        sql: "SELECT id, correct_option FROM questions WHERE quiz_id = ?",
        args: [id]
      });

      if (questions.rows.length === 0) {
        return res.status(400).json({ error: "لا يمكن نشر الكويز بدون إضافة أسئلة" });
      }

      for (const q of questions.rows) {
        if (!q.correct_option) {
          return res.status(400).json({ error: "أحد الأسئلة يفتقر إلى تحديد الإجابة الصحيحة" });
        }
        const optCount = await db.execute({
          sql: "SELECT COUNT(*) as c FROM options WHERE question_id = ?",
          args: [q.id]
        });
        if (Number(optCount.rows[0].c) < 4) {
          return res.status(400).json({ error: "يجب توفر 4 اختيارات لكل سؤال قبل النشر" });
        }
      }
    }

    await db.execute({
      sql: `UPDATE quizzes SET
              title = ?,
              description = ?,
              duration_seconds = ?,
              total_points = ?,
              max_attempts = ?,
              show_answers = ?,
              allow_back_navigation = ?,
              is_published = ?
            WHERE id = ?`,
      args: [
        title.trim(),
        description ? description.trim() : null,
        parseInt(duration_seconds, 10),
        Math.max(1, Math.round(Number(total_points)) || 100),
        parseInt(max_attempts, 10),
        show_answers,
        allow_back_navigation,
        is_published,
        id
      ]
    });

    res.json({ message: "تم تحديث الكويز بنجاح" });
  } catch (err: any) {
    res.status(500).json({ error: "فشل تحديث الكويز" });
  }
});

// Admin: Delete quiz
quizzesRouter.delete("/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const questions = await db.execute({ sql: "SELECT id FROM questions WHERE quiz_id = ?", args: [id] });
    for (const q of questions.rows) {
      await db.execute({ sql: "DELETE FROM options WHERE question_id = ?", args: [q.id] });
    }
    await db.batch([
      { sql: "DELETE FROM quiz_answers WHERE attempt_id IN (SELECT id FROM quiz_attempts WHERE quiz_id = ?)", args: [id] },
      { sql: "DELETE FROM quiz_attempts WHERE quiz_id = ?", args: [id] },
      { sql: "DELETE FROM questions WHERE quiz_id = ?", args: [id] },
      { sql: "DELETE FROM quizzes WHERE id = ?", args: [id] }
    ], "write");

    res.json({ message: "تم حذف الكويز بنجاح" });
  } catch (err: any) {
    res.status(500).json({ error: "فشل حذف الكويز" });
  }
});

// Admin: Add question with 4 options
quizzesRouter.post("/:id/questions", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id: quizId } = req.params;
    const { question_text, question_image, correct_option, points, options } = req.body;

    if (!question_text && !question_image) {
      return res.status(400).json({ error: "يجب كتابة نص السؤال أو إضافة صورة له" });
    }

    if (!correct_option || !["A", "B", "C", "D"].includes(correct_option)) {
      return res.status(400).json({ error: "يجب تحديد الإجابة الصحيحة من بين (A, B, C, D)" });
    }

    if (!options || !Array.isArray(options) || options.length !== 4) {
      return res.status(400).json({ error: "يجب تحديد 4 خيارات بالضبط (A, B, C, D)" });
    }

    // Verify option keys
    const requiredKeys = ["A", "B", "C", "D"];
    for (const k of requiredKeys) {
      const opt = options.find((o: any) => o.option_key === k);
      if (!opt || (!opt.option_text && !opt.option_image)) {
        return res.status(400).json({ error: `الخيار (${k}) يجب أن يحتوي على نص أو صورة` });
      }
    }

    const currentCount = await db.execute({
      sql: "SELECT COUNT(*) as c FROM questions WHERE quiz_id = ?",
      args: [quizId]
    });
    const questionNumber = Number(currentCount.rows[0].c) + 1;

    const questionId = crypto.randomUUID();

    await db.execute({
      sql: `INSERT INTO questions (id, quiz_id, question_number, question_text, question_image, correct_option, points)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        questionId,
        quizId,
        questionNumber,
        (question_text || "").trim(),
        question_image || null,
        correct_option,
        Math.max(1, Math.round(Number(points)) || 1)
      ]
    });

    for (const opt of options) {
      const optId = crypto.randomUUID();
      await db.execute({
        sql: `INSERT INTO options (id, question_id, option_key, option_text, option_image)
              VALUES (?, ?, ?, ?, ?)`,
        args: [
          optId,
          questionId,
          opt.option_key,
          (opt.option_text || "").trim(),
          opt.option_image || null
        ]
      });
    }

    // Recalculate quiz total_points to match sum of question points
    const sumRes = await db.execute({
      sql: "SELECT COALESCE(SUM(points), 0) as s FROM questions WHERE quiz_id = ?",
      args: [quizId]
    });
    const totalPts = Math.round(Number(sumRes.rows[0].s));
    await db.execute({
      sql: "UPDATE quizzes SET total_points = ? WHERE id = ?",
      args: [totalPts, quizId]
    });

    res.status(201).json({ message: "تمت إضافة السؤال بنجاح", questionId });
  } catch (err: any) {
    console.error("Add question error:", err);
    res.status(500).json({ error: "فشل إضافة السؤال" });
  }
});

// Admin: Delete question
quizzesRouter.delete("/questions/:questionId", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { questionId } = req.params;
    const qRes = await db.execute({ sql: "SELECT quiz_id FROM questions WHERE id = ?", args: [questionId] });
    const quizId = qRes.rows[0]?.quiz_id;

    await db.batch([
      { sql: "DELETE FROM options WHERE question_id = ?", args: [questionId] },
      { sql: "DELETE FROM questions WHERE id = ?", args: [questionId] }
    ], "write");

    if (quizId) {
      const sumRes = await db.execute({
        sql: "SELECT COALESCE(SUM(points), 0) as s FROM questions WHERE quiz_id = ?",
        args: [quizId]
      });
      const totalPts = Math.round(Number(sumRes.rows[0].s));
      await db.execute({
        sql: "UPDATE quizzes SET total_points = ? WHERE id = ?",
        args: [totalPts, quizId]
      });
    }

    res.json({ message: "تم حذف السؤال بنجاح" });
  } catch (err: any) {
    res.status(500).json({ error: "فشل حذف السؤال" });
  }
});

// ======================== TAKING & GRADING QUIZ ========================

// Start Quiz Attempt
quizzesRouter.post("/:id/start", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id: quizId } = req.params;
    const user = req.user!;

    const quizRes = await db.execute({
      sql: "SELECT * FROM quizzes WHERE id = ?",
      args: [quizId]
    });

    if (quizRes.rows.length === 0) {
      return res.status(404).json({ error: "الكويز غير موجود" });
    }

    const quiz = quizRes.rows[0];
    if (quiz.is_published === 0 && user.role !== "admin") {
      return res.status(403).json({ error: "الكويز غير متاح للبدء حالياً" });
    }

    // Check attempts limit
    const attemptsCountRes = await db.execute({
      sql: "SELECT COUNT(*) as c FROM quiz_attempts WHERE quiz_id = ? AND user_id = ? AND status != 'in_progress'",
      args: [quizId, user.id]
    });

    const completedAttempts = Number(attemptsCountRes.rows[0].c);
    const maxAttempts = Number(quiz.max_attempts);

    if (maxAttempts > 0 && completedAttempts >= maxAttempts) {
      return res.status(400).json({
        error: `لقد استنفدت الحد الأقصى للمحاولات المسموح بها (${maxAttempts} محاولة)`
      });
    }

    // Check if there is already an in_progress attempt
    const activeAttemptRes = await db.execute({
      sql: "SELECT * FROM quiz_attempts WHERE quiz_id = ? AND user_id = ? AND status = 'in_progress' ORDER BY started_at DESC LIMIT 1",
      args: [quizId, user.id]
    });

    const now = Date.now();
    const durationMs = Number(quiz.duration_seconds) * 1000;

    if (activeAttemptRes.rows.length > 0) {
      const active = activeAttemptRes.rows[0];
      const startedTime = new Date(String(active.started_at)).getTime();
      const elapsed = now - startedTime;

      // If active attempt is still valid within duration (+15s grace)
      if (elapsed < durationMs + 15000) {
        const remainingSeconds = Math.max(0, Math.floor((durationMs - elapsed) / 1000));
        return res.json({
          attemptId: active.id,
          started_at: active.started_at,
          duration_seconds: quiz.duration_seconds,
          remaining_seconds: remainingSeconds,
          allow_back_navigation: quiz.allow_back_navigation,
          server_time: new Date().toISOString()
        });
      } else {
        // Expired, mark as submitted/expired
        await db.execute({
          sql: "UPDATE quiz_attempts SET status = 'expired', submitted_at = ? WHERE id = ?",
          args: [new Date().toISOString(), active.id]
        });
      }
    }

    // Create fresh attempt
    const attemptId = crypto.randomUUID();
    const startTimeISO = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO quiz_attempts (id, quiz_id, user_id, started_at, status)
            VALUES (?, ?, ?, ?, 'in_progress')`,
      args: [attemptId, quizId, user.id, startTimeISO]
    });

    res.status(201).json({
      attemptId,
      started_at: startTimeISO,
      duration_seconds: quiz.duration_seconds,
      remaining_seconds: quiz.duration_seconds,
      allow_back_navigation: quiz.allow_back_navigation,
      server_time: startTimeISO
    });
  } catch (err: any) {
    console.error("Start quiz error:", err);
    res.status(500).json({ error: "فشل بدء محاولة الكويز" });
  }
});

// Submit Quiz & Server-side Auto Grading
quizzesRouter.post("/:id/submit", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id: quizId } = req.params;
    const { attemptId, answers } = req.body;
    // answers is expected to be an object: { [questionId: string]: 'A' | 'B' | 'C' | 'D' }
    const user = req.user!;

    if (!attemptId) {
      return res.status(400).json({ error: "معرف المحاولة مطلوب" });
    }

    const attemptRes = await db.execute({
      sql: "SELECT * FROM quiz_attempts WHERE id = ? AND quiz_id = ? AND user_id = ?",
      args: [attemptId, quizId, user.id]
    });

    if (attemptRes.rows.length === 0) {
      return res.status(404).json({ error: "المحاولة غير موجودة أو لا تخصك" });
    }

    const attempt = attemptRes.rows[0];
    const quizRes = await db.execute({ sql: "SELECT * FROM quizzes WHERE id = ?", args: [quizId] });
    if (quizRes.rows.length === 0) {
      return res.status(404).json({ error: "الكويز غير موجود" });
    }
    const quiz = quizRes.rows[0];

    // If attempt was already submitted, return the calculated results cleanly
    if (attempt.status === "submitted") {
      const answersRes = await db.execute({
        sql: `SELECT qa.question_id, qa.selected_option, qa.is_correct, qa.points_earned,
                     q.question_number, q.correct_option, q.points
              FROM quiz_answers qa
              JOIN questions q ON qa.question_id = q.id
              WHERE qa.attempt_id = ?
              ORDER BY q.question_number ASC`,
        args: [attemptId]
      });

      const totalQuestionsPoints = answersRes.rows.reduce(
        (sum, a) => sum + (Math.max(1, Math.round(Number(a.points)) || 1)),
        0
      );
      const earnedFromAnswers = answersRes.rows.reduce(
        (sum, a) => sum + (Number(a.is_correct) === 1 ? Math.max(1, Math.round(Number(a.points_earned !== null && a.points_earned !== undefined ? a.points_earned : a.points)) || 1) : 0),
        0
      );

      const totalQuizPoints = totalQuestionsPoints > 0 ? totalQuestionsPoints : Math.round(Number(quiz.total_points) || 100);
      const score = Math.round(earnedFromAnswers);
      const percentage = totalQuizPoints > 0 ? Math.round((score / totalQuizPoints) * 100) : 0;

      return res.json({
        message: "تم تسليم الكويز بنجاح",
        score: score,
        total_points: totalQuizPoints,
        percentage: percentage,
        correct_count: answersRes.rows.filter(a => Number(a.is_correct) === 1).length,
        wrong_count: answersRes.rows.filter(a => a.selected_option && Number(a.is_correct) === 0).length,
        unattempted_count: answersRes.rows.filter(a => !a.selected_option).length,
        total_questions: answersRes.rows.length,
        show_answers: quiz.show_answers === 1,
        is_time_expired: false,
        feedback: answersRes.rows.map(a => ({
          question_id: a.question_id,
          question_number: a.question_number,
          selected_option: a.selected_option,
          is_correct: Number(a.is_correct) === 1,
          correct_option: quiz.show_answers === 1 ? a.correct_option : null,
        }))
      });
    }

    const startedTime = new Date(String(attempt.started_at)).getTime();
    const durationMs = Number(quiz.duration_seconds) * 1000;
    const elapsedMs = Date.now() - startedTime;
    const isLate = req.body.isTimeExpired === true || elapsedMs > durationMs + 4000; // time expired

    // Fetch official questions and correct options from DB (Never trust client)
    const questionsRes = await db.execute({
      sql: "SELECT id, question_number, question_text, question_image, correct_option, points FROM questions WHERE quiz_id = ? ORDER BY question_number ASC",
      args: [quizId]
    });

    let totalPointsPossible = 0;
    let earnedPoints = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let unattemptedCount = 0;

    const answerSubmissions = answers || {};
    const detailedFeedback: any[] = [];

    // Clear any previous answers for this attempt before inserting
    await db.execute({
      sql: "DELETE FROM quiz_answers WHERE attempt_id = ?",
      args: [attemptId]
    });

    for (const q of questionsRes.rows) {
      const qId = String(q.id);
      const points = Math.max(1, Math.round(Number(q.points)) || 1);
      totalPointsPossible += points;

      const selected = answerSubmissions[qId] ? String(answerSubmissions[qId]).toUpperCase() : null;
      const isCorrect = selected !== null && selected === String(q.correct_option).toUpperCase();

      if (!selected) {
        unattemptedCount++;
      } else if (isCorrect) {
        correctCount++;
        earnedPoints += points;
      } else {
        wrongCount++;
      }

      const answerId = crypto.randomUUID();
      await db.execute({
        sql: `INSERT INTO quiz_answers (id, attempt_id, question_id, selected_option, is_correct, points_earned)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [answerId, attemptId, qId, selected, isCorrect ? 1 : 0, isCorrect ? points : 0]
      });

      // Prepare feedback (respecting show_answers setting)
      detailedFeedback.push({
        question_id: qId,
        question_number: q.question_number,
        selected_option: selected,
        is_correct: isCorrect,
        correct_option: quiz.show_answers === 1 ? q.correct_option : null,
      });
    }

    // Score is strictly the sum of points of CORRECT questions only!
    // Wrong questions earn 0 points, unanswered questions earn 0 points.
    const finalScore = Math.round(earnedPoints);
    const totalQuizPoints = totalPointsPossible > 0 ? totalPointsPossible : Math.max(1, Math.round(Number(quiz.total_points)) || 1);
    const roundedPercentage = totalQuizPoints > 0 ? Math.round((finalScore / totalQuizPoints) * 100) : 0;

    // Update quiz total_points in database to match questions points sum
    if (totalPointsPossible > 0) {
      await db.execute({
        sql: "UPDATE quizzes SET total_points = ? WHERE id = ?",
        args: [totalPointsPossible, quizId]
      });
    }

    const submittedAt = new Date().toISOString();
    const finalStatus = "submitted";

    await db.execute({
      sql: `UPDATE quiz_attempts SET
              submitted_at = ?,
              score = ?,
              percentage = ?,
              status = ?
            WHERE id = ?`,
      args: [submittedAt, finalScore, roundedPercentage, finalStatus, attemptId]
    });

    res.json({
      message: isLate ? "انتهى الوقت المحدد وتم تسليم وتصحيح إجاباتك بنجاح" : "تم تسليم الكويز بنجاح",
      score: finalScore,
      total_points: totalQuizPoints,
      percentage: roundedPercentage,
      correct_count: correctCount,
      wrong_count: wrongCount,
      unattempted_count: unattemptedCount,
      total_questions: questionsRes.rows.length,
      show_answers: quiz.show_answers === 1,
      is_time_expired: isLate,
      feedback: detailedFeedback
    });
  } catch (err: any) {
    console.error("Submit quiz error:", err);
    res.status(500).json({ error: "فشل تصحيح وتسليم الكويز" });
  }
});
