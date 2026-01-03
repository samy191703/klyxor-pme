import { Router } from "express";
import { getInseeAccessToken } from "../services/inseeAuth";

const router = Router();

router.get("/insee/health", async (_req, res) => {
  try {
    const apiKey = process.env.INSEE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ ok: false, error: "INSEE_API_KEY manquante" });
    }

    const baseUrl =
      process.env.INSEE_SIRENE_BASE_URL ?? "https://api.insee.fr/api-sirene/3.11";

    const url = `${baseUrl}/informations`;

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10_000);

    try {
      const r = await fetch(url, {
        method: "GET",
        headers: {
          "X-INSEE-Api-Key-Integration": apiKey,
          Accept: "application/json",
        },
        signal: ctrl.signal,
      });

      const ct = r.headers.get("content-type") ?? "";
      const body = await r.text();

      if (!r.ok) {
        return res.status(500).json({
          ok: false,
          error: `INSEE Sirene: HTTP ${r.status} ${r.statusText} content-type=${ct} body=${body}`,
        });
      }

      if (!ct.toLowerCase().includes("application/json")) {
        return res.status(500).json({
          ok: false,
          error: `INSEE Sirene: réponse non-JSON content-type=${ct} body=${body}`,
        });
      }

      return res.json({ ok: true, data: JSON.parse(body) });
    } finally {
      clearTimeout(t);
    }
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message ?? String(e) });
  }
});

export default router;
