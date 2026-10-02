import { Router } from "express";
import { db } from "../db";

export const taxonomyRouter = Router();

taxonomyRouter.get("/", async (req, res) => {
  try {
    const yearsResult = await db.execute("SELECT id, name, code, has_specialization FROM years ORDER BY ROWID ASC");
    const specsResult = await db.execute("SELECT id, name, code FROM specializations ORDER BY ROWID ASC");
    const termsResult = await db.execute("SELECT id, name, code FROM terms ORDER BY ROWID ASC");

    res.json({
      years: yearsResult.rows,
      specializations: specsResult.rows,
      terms: termsResult.rows,
    });
  } catch (err: any) {
    console.error("Taxonomy error:", err);
    res.status(500).json({ error: "فشل تحميل البيانات الأكاديمية" });
  }
});
