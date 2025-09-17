// server/routes/uploads.routes.ts
import type { Express, Request, Response } from "express";
import { isAuthenticated } from "server/auth";
import { requirePermission } from "server/middlewares/authMiddleware";
import { storage } from "server/storage";
import type { InsertDocument } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import fsp from "fs/promises";
import mime from "mime-types";

// ---------- Local storage (definitive) ----------
const UPLOAD_DIR = path.join(process.cwd(), "server", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const base = path
        .basename(file.originalname, ext)
        .replace(/[^\w\-]+/g, "_")
        .slice(0, 80);
      cb(null, `${base}__${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

// Helper to ensure path stays inside UPLOAD_DIR
function safeResolveUploadPath(relPath: string) {
  const normalized = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const abs = path.join(UPLOAD_DIR, normalized);
  if (!abs.startsWith(UPLOAD_DIR)) {
    throw new Error("Invalid path");
  }
  return abs;
}

// ---------- Routes ----------
export function registerUploadRoutes(app: Express): void {
  /**
   * @openapi
   * /api/contracts/{id}/uploads:
   *   post:
   *     summary: Upload one or multiple files and attach them to a contract
   *     tags: [Documents]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               files:
   *                 type: array
   *                 items:
   *                   type: string
   *                   format: binary
   *               type: { type: string, example: "contract" }
   *               category: { type: string, example: "administrative" }
   *               tags: { type: string, example: '["tag1","tag2"]' }
   *               metadata: { type: string, example: '{"note":"v1"}' }
   *     responses:
   *       200: { description: Documents created }
   *       400: { description: No files }
   *       500: { description: Server error }
   */
  app.post(
    "/api/contracts/:id/uploads",
    isAuthenticated,
    requirePermission("contracts", "update"),

    // Accept both "file" and "files"
    (req: Request, res: Response, next) => {
      const mw = upload.fields([
        { name: "file", maxCount: 10 },
        { name: "files", maxCount: 10 },
      ]);
      mw(req, res, (err: unknown) => {
        if (!err) return next();
        if (err instanceof multer.MulterError) {
          // e.g. LIMIT_FILE_SIZE, UNEXPECTED_FIELD, etc.
          return res.status(400).json({ error: err.message });
        }
        return res.status(500).json({ error: "Upload failed" });
      });
    },

    async (req: Request, res: Response) => {
      try {
        const { id: contractId } = req.params;

        // Normalize files (accept both "file" and "files")
        const filesMap = req.files as
          | Record<string, Express.Multer.File[] | undefined>
          | undefined;
        const files: Express.Multer.File[] = [
          ...(filesMap?.file ?? []),
          ...(filesMap?.files ?? []),
        ];

        if (!files.length) {
          return res.status(400).json({
            error: 'Aucun fichier fourni (champs attendus: "file" ou "files")',
          });
        }

        // Optional metadata fields from form-data (apply to all files in this request)
        const type = String(req.body?.type ?? "contract");
        const category = String(req.body?.category ?? "administrative");
        const isConfidential =
          String(req.body?.isConfidential ?? "false") === "true";

        // tags: allow repeated fields or a single JSON string
        let tags: string[] | undefined;
        if (Array.isArray(req.body?.tags)) {
          tags = (req.body.tags as string[]).map(String);
        } else if (typeof req.body?.tags === "string") {
          try {
            const parsed = JSON.parse(req.body.tags);
            tags = Array.isArray(parsed) ? parsed.map(String) : [req.body.tags];
          } catch {
            tags = [req.body.tags];
          }
        }

        // metadata: JSON string (optional)
        let metadata: any = undefined;
        if (req.body?.metadata) {
          try {
            metadata = JSON.parse(String(req.body.metadata));
          } catch {
            // ignore bad JSON; keep undefined
          }
        }

        // name: allow single string (applied to first file) or repeated names[]
        // If you only send a single "name", we'll apply it to that file; others keep originalname.
        const names = Array.isArray(req.body?.name)
          ? (req.body.name as string[]).map(String)
          : req.body?.name
          ? [String(req.body.name)]
          : [];

        const created = await Promise.all(
          files.map((f, idx) => {
            const chosenName = names[idx] || names[0] || f.originalname;
            const publicUrl = `/uploads/${f.filename}`; // served by your static /uploads

            const doc: InsertDocument = {
              contractId,
              name: chosenName,
              type,
              category,
              size: f.size,
              mimeType: f.mimetype || "application/octet-stream",
              url: publicUrl,
              metadata: metadata ?? {},
              tags: tags ?? [],
              status: "active",
              version: 1,
              isConfidential,
              uploadedBy: (req as any).user?.id || "system",
            } as InsertDocument;

            return storage.createDocument(doc);
          })
        );

        return res.status(201).json({ success: true, items: created });
      } catch (error: any) {
        console.error("Upload error:", error);
        return res
          .status(500)
          .json({ error: error?.message || "Upload failed" });
      }
    }
  );

  /**
   * @openapi
   * /uploads/{file}:
   *   get:
   *     summary: Download/serve a previously uploaded file (local)
   *     tags: [Documents]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: file
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: File stream }
   *       404: { description: Not found }
   */
  app.get("/uploads/:file(*)", isAuthenticated, async (req, res) => {
    try {
      const rel = String(req.params.file || "");
      const abs = safeResolveUploadPath(rel);
      await fsp.access(abs, fs.constants.R_OK);
      const stat = await fsp.stat(abs);
      const ctype =
        mime.contentType(path.extname(abs)) || "application/octet-stream";
      res.setHeader("Content-Type", ctype);
      res.setHeader("Content-Length", String(stat.size));
      const stream = fs.createReadStream(abs);
      stream.on("error", (err) => {
        console.error("Read error:", err);
        if (!res.headersSent) res.status(500).end();
      });
      stream.pipe(res);
    } catch (e: any) {
      if (e?.code === "ENOENT") return res.sendStatus(404);
      console.error("Download error:", e);
      return res.sendStatus(500);
    }
  });

  // -------- Documents CRUD (local paths in `url`) --------

  /**
   * @openapi
   * /api/documents:
   *   get:
   *     summary: List documents (optionally by contractId)
   *     tags: [Documents]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: query
   *         name: contractId
   *         required: false
   *         schema: { type: string }
   *     responses:
   *       200: { description: Documents list }
   */
  app.get("/api/documents", isAuthenticated, async (req, res) => {
    try {
      const { contractId } = req.query as { contractId?: string };
      const docs = contractId
        ? await storage.getDocumentsByContractId(contractId)
        : await storage.getDocuments();
      res.json(docs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  /**
   * @openapi
   * /api/documents/{id}:
   *   get:
   *     summary: Get a document by id
   *     tags: [Documents]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: Document }
   *       404: { description: Not found }
   */
  app.get("/api/documents/:id", isAuthenticated, async (req, res) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc) return res.status(404).json({ error: "Not found" });
      res.json(doc);
    } catch {
      res.status(500).json({ error: "Failed to fetch document" });
    }
  });

  /**
   * @openapi
   * /api/documents:
   *   post:
   *     summary: Create a document row (manual metadata insert)
   *     tags: [Documents]
   *     security:
   *       - cookieAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *     responses:
   *       200: { description: Created }
   */
  app.post("/api/documents", isAuthenticated, async (req, res) => {
    try {
      const doc = await storage.createDocument({
        ...req.body,
        uploadedBy: (req.user as any).id,
      });
      res.json(doc);
    } catch (error) {
      res.status(500).json({ error: "Failed to create document" });
    }
  });

  /**
   * @openapi
   * /api/documents/{id}:
   *   put:
   *     summary: Update a document metadata
   *     tags: [Documents]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *     responses:
   *       200: { description: Updated }
   *       404: { description: Not found }
   */
  app.put("/api/documents/:id", isAuthenticated, async (req, res) => {
    try {
      const updated = await storage.updateDocument(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: "Not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update document" });
    }
  });

  /**
   * @openapi
   * /api/documents/{id}:
   *   delete:
   *     summary: Soft-delete a document
   *     tags: [Documents]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: Deleted }
   */
  app.delete("/api/documents/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteDocument(req.params.id);
      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete document" });
    }
  });
}
