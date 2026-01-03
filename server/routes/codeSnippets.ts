import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../auth";
import { z } from "zod";
import type { InsertCodeSnippet } from "@shared/schema";

const router = Router();

// Schema de validation pour création/modification
const createSnippetSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  code: z.string().min(1),
  language: z.string().min(1),
  context: z.string().optional(),
  contextId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().default(false),
  sharedWith: z.array(z.string()).optional(),
});

// GET /api/code-snippets - Liste des snippets
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const userId = (req.user as any)?.id;
    const { context, contextId } = req.query;

    let snippets;
    if (context) {
      snippets = await storage.getCodeSnippetsByContext(
        context as string,
        contextId as string | undefined
      );
    } else {
      snippets = await storage.getCodeSnippets(userId);
    }

    res.json(snippets);
  } catch (error) {
    console.error("Error fetching snippets:", error);
    res.status(500).json({ error: "Failed to fetch snippets" });
  }
});

// GET /api/code-snippets/:id - Récupère un snippet
router.get("/:id", isAuthenticated, async (req, res) => {
  try {
    const snippet = await storage.getCodeSnippet(req.params.id);
    
    if (!snippet) {
      return res.status(404).json({ error: "Snippet not found" });
    }

    const userId = (req.user as any)?.id;
    const canView = snippet.isPublic || 
                    snippet.createdBy === userId || 
                    snippet.sharedWith?.includes(userId);

    if (!canView) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Increment view count
    await storage.incrementSnippetViewCount(req.params.id);

    res.json(snippet);
  } catch (error) {
    console.error("Error fetching snippet:", error);
    res.status(500).json({ error: "Failed to fetch snippet" });
  }
});

// POST /api/code-snippets - Crée un nouveau snippet
router.post("/", isAuthenticated, async (req, res) => {
  try {
    const validation = createSnippetSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: "Invalid data", 
        details: validation.error.errors 
      });
    }

    const userId = (req.user as any)?.id;
    const snippetData: InsertCodeSnippet = {
      ...validation.data,
      createdBy: userId,
    };

    const snippet = await storage.createCodeSnippet(snippetData);
    res.json(snippet);
  } catch (error) {
    console.error("Error creating snippet:", error);
    res.status(500).json({ error: "Failed to create snippet" });
  }
});

// PUT /api/code-snippets/:id - Met à jour un snippet
router.put("/:id", isAuthenticated, async (req, res) => {
  try {
    const snippet = await storage.getCodeSnippet(req.params.id);
    
    if (!snippet) {
      return res.status(404).json({ error: "Snippet not found" });
    }

    const userId = (req.user as any)?.id;
    
    // Seul le créateur peut modifier
    if (snippet.createdBy !== userId) {
      return res.status(403).json({ error: "Only the creator can edit this snippet" });
    }

    const validation = createSnippetSchema.partial().safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: "Invalid data", 
        details: validation.error.errors 
      });
    }

    const updatedSnippet = await storage.updateCodeSnippet(req.params.id, validation.data);
    res.json(updatedSnippet);
  } catch (error) {
    console.error("Error updating snippet:", error);
    res.status(500).json({ error: "Failed to update snippet" });
  }
});

// DELETE /api/code-snippets/:id - Supprime un snippet
router.delete("/:id", isAuthenticated, async (req, res) => {
  try {
    const snippet = await storage.getCodeSnippet(req.params.id);
    
    if (!snippet) {
      return res.status(404).json({ error: "Snippet not found" });
    }

    const userId = (req.user as any)?.id;
    const userRole = (req.user as any)?.role;
    
    // Seul le créateur ou un admin peut supprimer
    if (snippet.createdBy !== userId && userRole !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const success = await storage.deleteCodeSnippet(req.params.id);
    
    if (success) {
      res.json({ message: "Snippet deleted successfully" });
    } else {
      res.status(500).json({ error: "Failed to delete snippet" });
    }
  } catch (error) {
    console.error("Error deleting snippet:", error);
    res.status(500).json({ error: "Failed to delete snippet" });
  }
});

// POST /api/code-snippets/:id/copy - Copie un snippet
router.post("/:id/copy", isAuthenticated, async (req, res) => {
  try {
    const snippet = await storage.getCodeSnippet(req.params.id);
    
    if (!snippet) {
      return res.status(404).json({ error: "Snippet not found" });
    }

    // Increment copy count
    await storage.incrementSnippetCopyCount(req.params.id);

    res.json({ 
      success: true,
      code: snippet.code,
      language: snippet.language 
    });
  } catch (error) {
    console.error("Error copying snippet:", error);
    res.status(500).json({ error: "Failed to copy snippet" });
  }
});

export default router;