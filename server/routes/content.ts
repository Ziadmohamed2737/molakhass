import { Router } from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { db } from "../db";
import { upload, getSafeFilePath } from "../storage";
import { AuthRequest, requireAuth, requireAdmin, requireContentManager } from "../auth";

export const contentRouter = Router();

// ======================== LECTURES ========================

// List lectures for a subject
contentRouter.get("/subjects/:subjectId/lectures", async (req: AuthRequest, res) => {
  try {
    const { subjectId } = req.params;
    const user = req.user;
    const isStaff = user && (user.role === "admin" || user.role === "moderator");
    const filterPublished = !isStaff ? "AND l.is_published = 1" : "";
    const creatorSelect = isStaff
      ? "u.full_name as creator_name, u.student_code as creator_code, u.role as creator_role, l.created_by,"
      : "NULL as creator_name, NULL as creator_code, NULL as creator_role, NULL as created_by,";

    const query = `
      SELECT l.id, l.subject_id, l.lecture_number, l.title, l.description, l.is_published, l.created_at,
             ${creatorSelect}
             (SELECT COUNT(*) FROM documents d WHERE d.lecture_id = l.id AND d.is_published = 1) as files_count
      FROM lectures l
      LEFT JOIN users u ON l.created_by = u.id
      WHERE l.subject_id = ? ${filterPublished}
      ORDER BY l.lecture_number ASC, l.created_at ASC
    `;

    const result = await db.execute({ sql: query, args: [subjectId] });
    res.json({ lectures: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: "فشل تحميل قائمة المحاضرات" });
  }
});

// Get single lecture with its documents
contentRouter.get("/lectures/:id", async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const lectureRes = await db.execute({
      sql: `SELECT l.*, s.name as subject_name, s.code as subject_code
            FROM lectures l
            JOIN subjects s ON l.subject_id = s.id
            WHERE l.id = ?`,
      args: [id]
    });

    if (lectureRes.rows.length === 0) {
      return res.status(404).json({ error: "المحاضرة غير موجودة" });
    }

    const lecture = lectureRes.rows[0];
    const isStaff = user && (user.role === "admin" || user.role === "moderator");
    if (lecture.is_published === 0 && !isStaff) {
      return res.status(403).json({ error: "هذه المحاضرة غير منشورة حالياً" });
    }

    const docFilter = !isStaff ? "AND d.is_published = 1" : "";
    const uploaderSelect = isStaff ? "u.full_name as uploader_name, u.role as uploader_role, d.uploaded_by," : "NULL as uploader_name, NULL as uploader_role, NULL as uploaded_by,";
    const docsRes = await db.execute({
      sql: `SELECT d.id, d.subject_id, d.lecture_id, d.display_name, d.file_type, d.file_size, d.sort_order, d.is_published, d.created_at,
                   ${uploaderSelect}
                   1
            FROM documents d
            LEFT JOIN users u ON d.uploaded_by = u.id
            WHERE d.lecture_id = ? ${docFilter}
            ORDER BY d.sort_order ASC, d.created_at ASC`,
      args: [id]
    });

    res.json({
      lecture,
      documents: docsRes.rows
    });
  } catch (err: any) {
    res.status(500).json({ error: "فشل جلب تفاصيل المحاضرة" });
  }
});

// Staff: Create lecture
contentRouter.post("/lectures", requireContentManager, async (req: AuthRequest, res) => {
  try {
    const { subject_id, lecture_number, title, description, is_published } = req.body;

    if (!subject_id || lecture_number === undefined || !title) {
      return res.status(400).json({ error: "رقم المحاضرة وعنوانها والمادة حقول مطلوبة" });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const creatorId = req.user?.id || null;

    await db.execute({
      sql: `INSERT INTO lectures (id, subject_id, lecture_number, title, description, is_published, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        subject_id,
        parseInt(lecture_number, 10),
        title.trim(),
        description ? description.trim() : null,
        is_published !== undefined ? is_published : 1,
        creatorId,
        now
      ]
    });

    res.status(201).json({ message: "تمت إضافة المحاضرة بنجاح", lectureId: id });
  } catch (err: any) {
    res.status(500).json({ error: "فشل إنشاء المحاضرة" });
  }
});

// Admin: Update lecture
contentRouter.put("/lectures/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { lecture_number, title, description, is_published } = req.body;

    await db.execute({
      sql: `UPDATE lectures SET lecture_number = ?, title = ?, description = ?, is_published = ?
            WHERE id = ?`,
      args: [parseInt(lecture_number, 10), title.trim(), description ? description.trim() : null, is_published, id]
    });

    res.json({ message: "تم تعديل المحاضرة بنجاح" });
  } catch (err: any) {
    res.status(500).json({ error: "فشل تعديل المحاضرة" });
  }
});

// Admin: Delete lecture
contentRouter.delete("/lectures/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const docs = await db.execute({ sql: "SELECT file_path FROM documents WHERE lecture_id = ?", args: [id] });
    for (const d of docs.rows) {
      if (d.file_path && fs.existsSync(String(d.file_path))) {
        try { fs.unlinkSync(String(d.file_path)); } catch (_) {}
      }
    }
    await db.batch([
      { sql: "DELETE FROM documents WHERE lecture_id = ?", args: [id] },
      { sql: "DELETE FROM lectures WHERE id = ?", args: [id] }
    ], "write");

    res.json({ message: "تم حذف المحاضرة وملفاتها بنجاح" });
  } catch (err: any) {
    res.status(500).json({ error: "فشل حذف المحاضرة" });
  }
});

// ======================== SECTIONS ========================

// List sections for a subject
contentRouter.get("/subjects/:subjectId/sections", async (req: AuthRequest, res) => {
  try {
    const { subjectId } = req.params;
    const user = req.user;
    const isStaff = user && (user.role === "admin" || user.role === "moderator");
    const filterPublished = !isStaff ? "AND s.is_published = 1" : "";
    const creatorSelect = isStaff
      ? "u.full_name as creator_name, u.student_code as creator_code, u.role as creator_role, s.created_by,"
      : "NULL as creator_name, NULL as creator_code, NULL as creator_role, NULL as created_by,";

    const query = `
      SELECT s.id, s.subject_id, s.section_number, s.title, s.description, s.is_published, s.created_at,
             ${creatorSelect}
             (SELECT COUNT(*) FROM documents d WHERE d.section_id = s.id AND d.is_published = 1) as files_count
      FROM sections s
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.subject_id = ? ${filterPublished}
      ORDER BY s.section_number ASC, s.created_at ASC
    `;

    const result = await db.execute({ sql: query, args: [subjectId] });
    res.json({ sections: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: "فشل تحميل قائمة السكاشن" });
  }
});

// Get single section with its documents
contentRouter.get("/sections/:id", async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const sectionRes = await db.execute({
      sql: `SELECT s.*, sub.name as subject_name, sub.code as subject_code
            FROM sections s
            JOIN subjects sub ON s.subject_id = sub.id
            WHERE s.id = ?`,
      args: [id]
    });

    if (sectionRes.rows.length === 0) {
      return res.status(404).json({ error: "السكشن غير موجود" });
    }

    const section = sectionRes.rows[0];
    const isStaff = user && (user.role === "admin" || user.role === "moderator");
    if (section.is_published === 0 && !isStaff) {
      return res.status(403).json({ error: "هذا السكشن غير منشور حالياً" });
    }

    const docFilter = !isStaff ? "AND d.is_published = 1" : "";
    const uploaderSelect = isStaff ? "u.full_name as uploader_name, u.role as uploader_role, d.uploaded_by," : "NULL as uploader_name, NULL as uploader_role, NULL as uploaded_by,";
    const docsRes = await db.execute({
      sql: `SELECT d.id, d.subject_id, d.section_id, d.display_name, d.file_type, d.file_size, d.sort_order, d.is_published, d.created_at,
                   ${uploaderSelect}
                   1
            FROM documents d
            LEFT JOIN users u ON d.uploaded_by = u.id
            WHERE d.section_id = ? ${docFilter}
            ORDER BY d.sort_order ASC, d.created_at ASC`,
      args: [id]
    });

    res.json({
      section,
      documents: docsRes.rows
    });
  } catch (err: any) {
    res.status(500).json({ error: "فشل جلب تفاصيل السكشن" });
  }
});

// Staff: Create section
contentRouter.post("/sections", requireContentManager, async (req: AuthRequest, res) => {
  try {
    const { subject_id, section_number, title, description, is_published } = req.body;

    if (!subject_id || section_number === undefined || !title) {
      return res.status(400).json({ error: "رقم السكشن وعنوانه والمادة حقول مطلوبة" });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const creatorId = req.user?.id || null;

    await db.execute({
      sql: `INSERT INTO sections (id, subject_id, section_number, title, description, is_published, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        subject_id,
        parseInt(section_number, 10),
        title.trim(),
        description ? description.trim() : null,
        is_published !== undefined ? is_published : 1,
        creatorId,
        now
      ]
    });

    res.status(201).json({ message: "تمت إضافة السكشن بنجاح", sectionId: id });
  } catch (err: any) {
    res.status(500).json({ error: "فشل إضافة السكشن" });
  }
});

// Admin: Update section
contentRouter.put("/sections/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { section_number, title, description, is_published } = req.body;

    await db.execute({
      sql: `UPDATE sections SET section_number = ?, title = ?, description = ?, is_published = ?
            WHERE id = ?`,
      args: [parseInt(section_number, 10), title.trim(), description ? description.trim() : null, is_published, id]
    });

    res.json({ message: "تم تعديل السكشن بنجاح" });
  } catch (err: any) {
    res.status(500).json({ error: "فشل تعديل السكشن" });
  }
});

// Admin: Delete section
contentRouter.delete("/sections/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const docs = await db.execute({ sql: "SELECT file_path FROM documents WHERE section_id = ?", args: [id] });
    for (const d of docs.rows) {
      if (d.file_path && fs.existsSync(String(d.file_path))) {
        try { fs.unlinkSync(String(d.file_path)); } catch (_) {}
      }
    }
    await db.batch([
      { sql: "DELETE FROM documents WHERE section_id = ?", args: [id] },
      { sql: "DELETE FROM sections WHERE id = ?", args: [id] }
    ], "write");

    res.json({ message: "تم حذف السكشن وملفاته بنجاح" });
  } catch (err: any) {
    res.status(500).json({ error: "فشل حذف السكشن" });
  }
});

// ======================== SHEETS ========================

// List sheets for a subject
contentRouter.get("/subjects/:subjectId/sheets", async (req: AuthRequest, res) => {
  try {
    const { subjectId } = req.params;
    const user = req.user;
    const isStaff = user && (user.role === "admin" || user.role === "moderator");
    const filterPublished = !isStaff ? "AND sh.is_published = 1" : "";
    const creatorSelect = isStaff
      ? "u.full_name as creator_name, u.student_code as creator_code, u.role as creator_role, sh.created_by,"
      : "NULL as creator_name, NULL as creator_code, NULL as creator_role, NULL as created_by,";

    const query = `
      SELECT sh.id, sh.subject_id, sh.title, sh.description, sh.is_published, sh.created_at,
             ${creatorSelect}
             (SELECT COUNT(*) FROM documents d WHERE d.sheet_id = sh.id AND d.is_published = 1) as files_count
      FROM sheets sh
      LEFT JOIN users u ON sh.created_by = u.id
      WHERE sh.subject_id = ? ${filterPublished}
      ORDER BY sh.created_at ASC
    `;

    const result = await db.execute({ sql: query, args: [subjectId] });
    res.json({ sheets: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: "فشل تحميل قائمة الشيتات" });
  }
});

// Get single sheet with documents
contentRouter.get("/sheets/:id", async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const sheetRes = await db.execute({
      sql: `SELECT sh.*, s.name as subject_name, s.code as subject_code
            FROM sheets sh
            JOIN subjects s ON sh.subject_id = s.id
            WHERE sh.id = ?`,
      args: [id]
    });

    if (sheetRes.rows.length === 0) {
      return res.status(404).json({ error: "الشيت غير موجود" });
    }

    const sheet = sheetRes.rows[0];
    const isStaff = user && (user.role === "admin" || user.role === "moderator");
    if (sheet.is_published === 0 && !isStaff) {
      return res.status(403).json({ error: "هذا الشيت غير منشور حالياً" });
    }

    const docFilter = !isStaff ? "AND d.is_published = 1" : "";
    const uploaderSelect = isStaff ? "u.full_name as uploader_name, u.role as uploader_role, d.uploaded_by," : "NULL as uploader_name, NULL as uploader_role, NULL as uploaded_by,";
    const docsRes = await db.execute({
      sql: `SELECT d.id, d.subject_id, d.sheet_id, d.display_name, d.file_type, d.file_size, d.sort_order, d.is_published, d.created_at,
                   ${uploaderSelect}
                   1
            FROM documents d
            LEFT JOIN users u ON d.uploaded_by = u.id
            WHERE d.sheet_id = ? ${docFilter}
            ORDER BY d.sort_order ASC, d.created_at ASC`,
      args: [id]
    });

    res.json({
      sheet,
      documents: docsRes.rows
    });
  } catch (err: any) {
    res.status(500).json({ error: "فشل جلب تفاصيل الشيت" });
  }
});

// Staff: Create sheet
contentRouter.post("/sheets", requireContentManager, async (req: AuthRequest, res) => {
  try {
    const { subject_id, title, description, is_published } = req.body;

    if (!subject_id || !title) {
      return res.status(400).json({ error: "عنوان الشيت والمادة حقول مطلوبة" });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const creatorId = req.user?.id || null;

    await db.execute({
      sql: `INSERT INTO sheets (id, subject_id, title, description, is_published, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, subject_id, title.trim(), description ? description.trim() : null, is_published !== undefined ? is_published : 1, creatorId, now]
    });

    res.status(201).json({ message: "تمت إضافة الشيت بنجاح", sheetId: id });
  } catch (err: any) {
    res.status(500).json({ error: "فشل إضافة الشيت" });
  }
});

// Admin: Update sheet
contentRouter.put("/sheets/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { title, description, is_published } = req.body;

    await db.execute({
      sql: `UPDATE sheets SET title = ?, description = ?, is_published = ? WHERE id = ?`,
      args: [title.trim(), description ? description.trim() : null, is_published, id]
    });

    res.json({ message: "تم تعديل الشيت بنجاح" });
  } catch (err: any) {
    res.status(500).json({ error: "فشل تعديل الشيت" });
  }
});

// Admin: Delete sheet
contentRouter.delete("/sheets/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const docs = await db.execute({ sql: "SELECT file_path FROM documents WHERE sheet_id = ?", args: [id] });
    for (const d of docs.rows) {
      if (d.file_path && fs.existsSync(String(d.file_path))) {
        try { fs.unlinkSync(String(d.file_path)); } catch (_) {}
      }
    }
    await db.batch([
      { sql: "DELETE FROM documents WHERE sheet_id = ?", args: [id] },
      { sql: "DELETE FROM sheets WHERE id = ?", args: [id] }
    ], "write");

    res.json({ message: "تم حذف الشيت وملفاته بنجاح" });
  } catch (err: any) {
    res.status(500).json({ error: "فشل حذف الشيت" });
  }
});

// ======================== UPLOAD & DOCUMENTS ========================

// Upload document(s)
contentRouter.post("/upload", requireContentManager, upload.array("files", 10), async (req: AuthRequest, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "لم يتم تحديد أي ملف للرفع" });
    }

    const { subject_id, lecture_id, section_id, sheet_id } = req.body;
    if (!subject_id) {
      // Clean up uploaded files
      files.forEach(f => { try { fs.unlinkSync(f.path); } catch (_) {} });
      return res.status(400).json({ error: "معرف المادة مطلوب" });
    }

    // display_names might come as array or string or single field
    let displayNames = req.body.display_names;
    if (typeof displayNames === "string") {
      try {
        displayNames = JSON.parse(displayNames);
      } catch {
        displayNames = [displayNames];
      }
    } else if (!Array.isArray(displayNames)) {
      displayNames = [];
    }

    let sortOrders = req.body.sort_orders;
    if (typeof sortOrders === "string") {
      try {
        sortOrders = JSON.parse(sortOrders);
      } catch {
        sortOrders = [sortOrders];
      }
    } else if (!Array.isArray(sortOrders)) {
      sortOrders = [];
    }

    const uploadedDocuments = [];
    const now = new Date().toISOString();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const docId = crypto.randomUUID();
      const displayName = displayNames[i] && displayNames[i].trim()
        ? displayNames[i].trim()
        : file.originalname.replace(/\.[^/.]+$/, "");
      const sortOrder = sortOrders[i] !== undefined ? parseInt(sortOrders[i], 10) : i + 1;

      await db.execute({
        sql: `INSERT INTO documents (
                id, subject_id, lecture_id, section_id, sheet_id,
                display_name, file_path, file_type, file_size, sort_order,
                is_published, uploaded_by, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        args: [
          docId,
          subject_id,
          lecture_id || null,
          section_id || null,
          sheet_id || null,
          displayName,
          file.path,
          file.mimetype,
          file.size,
          sortOrder,
          req.user!.id,
          now
        ]
      });

      uploadedDocuments.push({
        id: docId,
        display_name: displayName,
        file_type: file.mimetype,
        file_size: file.size,
        sort_order: sortOrder
      });
    }

    res.status(201).json({
      message: "تم رفع الملفات بنجاح",
      documents: uploadedDocuments
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message || "حدث خطأ أثناء رفع الملفات" });
  }
});

// Update document metadata (display name, sort order, publish state)
contentRouter.put("/documents/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { display_name, sort_order, is_published } = req.body;

    await db.execute({
      sql: `UPDATE documents
            SET display_name = COALESCE(?, display_name),
                sort_order = COALESCE(?, sort_order),
                is_published = COALESCE(?, is_published)
            WHERE id = ?`,
      args: [
        display_name !== undefined ? display_name.trim() : null,
        sort_order !== undefined ? parseInt(sort_order, 10) : null,
        is_published !== undefined ? is_published : null,
        id
      ]
    });

    res.json({ message: "تم تحديث الملف بنجاح" });
  } catch (err: any) {
    res.status(500).json({ error: "فشل تحديث بيانات الملف" });
  }
});

// Delete document
contentRouter.delete("/documents/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await db.execute({ sql: "SELECT file_path FROM documents WHERE id = ?", args: [id] });
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "الملف غير موجود" });
    }

    const filePath = String(result.rows[0].file_path);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (_) {}
    }

    await db.execute({ sql: "DELETE FROM documents WHERE id = ?", args: [id] });
    res.json({ message: "تم حذف الملف نهائياً بنجاح" });
  } catch (err: any) {
    res.status(500).json({ error: "فشل حذف الملف" });
  }
});
