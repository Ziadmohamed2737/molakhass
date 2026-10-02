import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import { initDatabase } from "./server/db";
import { authenticateToken } from "./server/auth";
import { authRouter } from "./server/routes/auth";
import { taxonomyRouter } from "./server/routes/taxonomy";
import { statsRouter } from "./server/routes/stats";
import { subjectsRouter } from "./server/routes/subjects";
import { contentRouter } from "./server/routes/content";
import { quizzesRouter } from "./server/routes/quizzes";
import { filesRouter } from "./server/routes/files";
import { adminRouter } from "./server/routes/admin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  await initDatabase();

  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.use(cookieParser());

  // Global Auth middleware (populates req.user if token is present)
  app.use(authenticateToken);

  // API Routes
  app.use("/api/auth", authRouter);
  app.use("/api/taxonomy", taxonomyRouter);
  app.use("/api/stats", statsRouter);
  app.use("/api/subjects", subjectsRouter);
  app.use("/api/content", contentRouter);
  app.use("/api/quizzes", quizzesRouter);
  app.use("/api/files", filesRouter);
  app.use("/api/admin", adminRouter);

  // Global API error handler
  app.use("/api", (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("API Error:", err);
    res.status(err.status || 500).json({
      error: err.message || "حدث خطأ غير متوقع في الخادم"
    });
  });

  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    // Vite middleware in development
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, host: "0.0.0.0", port: PORT },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    // Serve production build
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Academic Library Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
