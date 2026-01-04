// server/routes/insee.routes.ts

import { Router } from "express";
import { getInseeAccessToken } from "../services/inseeAuth.ts";
import {
  getLatestIndexPoint,
  getSeriesIndexPoints,
} from "../services/insee/bdmProvider.ts";

const router = Router();

/**
 * Récupère le dernier point d'une série BDM
 */
router.get("/insee/bdm/:code/latest", async (req, res) => {
  const code = String(req.params.code || "").toUpperCase();
  const latest = await getLatestIndexPoint(code);
  return res.json({ ok: true, code, latest });
});

/**
 * Récupère la série complète (historique) d'une série BDM
 */
router.get("/insee/bdm/:code/series", async (req, res) => {
  const code = String(req.params.code || "").toUpperCase();
  const series = await getSeriesIndexPoints(code);
  return res.json({ ok: true, code, series });
});

/**
 * Healthcheck INSEE OAuth
 */
router.get("/insee/health", async (_req, res) => {
  try {
    const token = await getInseeAccessToken();
    return res.json({
      ok: true,
      oauth: true,
      tokenPreview: `${token.slice(0, 10)}...`,
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      oauth: false,
      error: e?.message ?? String(e),
    });
  }
});

export default router;
