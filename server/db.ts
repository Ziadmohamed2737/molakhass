import { createClient } from "@libsql/client";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const dataDir = path.resolve(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbUrl = `file:${path.join(dataDir, "academic_library.db")}`;
export const db = createClient({
  url: dbUrl,
});

export async function initDatabase() {
  await db.batch([
    `CREATE TABLE IF NOT EXISTS years (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      has_specialization INTEGER NOT NULL DEFAULT 1
    );`,
    `CREATE TABLE IF NOT EXISTS specializations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS terms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      student_code TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      year_id TEXT NOT NULL,
      specialization_id TEXT,
      role TEXT NOT NULL DEFAULT 'student',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      last_seen TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      doctor_name TEXT NOT NULL,
      year_id TEXT NOT NULL,
      specialization_id TEXT,
      term_id TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS lectures (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      lecture_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS sections (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      section_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS sheets (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      lecture_id TEXT,
      section_id TEXT,
      sheet_id TEXT,
      display_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 1,
      is_published INTEGER NOT NULL DEFAULT 1,
      uploaded_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      duration_seconds INTEGER NOT NULL DEFAULT 600,
      total_points INTEGER NOT NULL DEFAULT 100,
      max_attempts INTEGER NOT NULL DEFAULT 1,
      show_answers INTEGER NOT NULL DEFAULT 1,
      allow_back_navigation INTEGER NOT NULL DEFAULT 1,
      is_published INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL,
      question_number INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      question_image TEXT,
      correct_option TEXT NOT NULL,
      points REAL NOT NULL DEFAULT 1
    );`,
    `CREATE TABLE IF NOT EXISTS options (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      option_key TEXT NOT NULL,
      option_text TEXT NOT NULL,
      option_image TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS quiz_attempts (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      started_at TEXT NOT NULL,
      submitted_at TEXT,
      score REAL DEFAULT 0,
      percentage REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'in_progress'
    );`,
    `CREATE TABLE IF NOT EXISTS quiz_answers (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      selected_option TEXT,
      is_correct INTEGER DEFAULT 0,
      points_earned REAL DEFAULT 0
    );`,
    `CREATE TABLE IF NOT EXISTS student_favorites (
      user_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, subject_id)
    );`
  ], "write");

  // Populate base academic taxonomy if not present (Year, Spec, Term lookups only - NOT fake user/content data)
  const existingYears = await db.execute("SELECT COUNT(*) as c FROM years");
  if (Number(existingYears.rows[0].c) === 0) {
    await db.batch([
      { sql: "INSERT INTO years (id, name, code, has_specialization) VALUES (?, ?, ?, ?)", args: ["prep", "إعدادي", "prep", 0] },
      { sql: "INSERT INTO years (id, name, code, has_specialization) VALUES (?, ?, ?, ?)", args: ["first", "الأولى", "first", 1] },
      { sql: "INSERT INTO years (id, name, code, has_specialization) VALUES (?, ?, ?, ?)", args: ["second", "الثانية", "second", 1] },
      { sql: "INSERT INTO years (id, name, code, has_specialization) VALUES (?, ?, ?, ?)", args: ["third", "الثالثة", "third", 1] },
      { sql: "INSERT INTO years (id, name, code, has_specialization) VALUES (?, ?, ?, ?)", args: ["fourth", "الرابعة", "fourth", 1] },

      { sql: "INSERT INTO specializations (id, name, code) VALUES (?, ?, ?)", args: ["comm", "اتصالات", "comm"] },
      { sql: "INSERT INTO specializations (id, name, code) VALUES (?, ?, ?)", args: ["civil", "مدني", "civil"] },
      { sql: "INSERT INTO specializations (id, name, code) VALUES (?, ?, ?)", args: ["arch", "عمارة", "arch"] },

      { sql: "INSERT INTO terms (id, name, code) VALUES (?, ?, ?)", args: ["term1", "الترم الأول", "term1"] },
      { sql: "INSERT INTO terms (id, name, code) VALUES (?, ?, ?)", args: ["term2", "الترم الثاني", "term2"] }
    ], "write");
  }

  // Ensure created_by columns exist in lectures, sections, sheets, quizzes
  const tableCols = [
    { table: "lectures", col: "created_by TEXT" },
    { table: "sections", col: "created_by TEXT" },
    { table: "sheets", col: "created_by TEXT" },
    { table: "quizzes", col: "created_by TEXT" },
  ];
  for (const item of tableCols) {
    try {
      await db.execute(`ALTER TABLE ${item.table} ADD COLUMN ${item.col};`);
    } catch {
      // Column may already exist
    }
  }

  // Ensure Primary Super Admin account exists:
  // Code: 20250000, Password: 05122007
  try {
    const adminCode = "20250000";
    const adminPass = "05122007";
    const hash = await bcrypt.hash(adminPass, 10);
    const now = new Date().toISOString();

    const existingAdmin = await db.execute({
      sql: "SELECT id FROM users WHERE student_code = ?",
      args: [adminCode]
    });

    if (existingAdmin.rows.length === 0) {
      const adminId = crypto.randomUUID();
      await db.execute({
        sql: `INSERT INTO users (
          id, full_name, phone, student_code, password_hash, year_id, specialization_id, role, is_active, created_at, last_seen
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        args: [
          adminId,
          "المدير الأساسي",
          "01050368224",
          adminCode,
          hash,
          "fourth",
          null,
          "admin",
          now,
          now
        ]
      });
      console.log("Primary Super Admin account (20250000) seeded successfully.");
    } else {
      // Ensure password and role are synchronized
      await db.execute({
        sql: "UPDATE users SET password_hash = ?, role = 'admin', is_active = 1 WHERE student_code = ?",
        args: [hash, adminCode]
      });
    }
  } catch (err) {
    console.error("Failed to seed primary admin account:", err);
  }

  console.log("Database initialized successfully.");
}
