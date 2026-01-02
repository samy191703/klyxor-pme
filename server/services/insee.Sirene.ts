// server/services/inseeSirene.ts
import assert from "node:assert";

const BASE_URL = process.env.INSEE_SIRENE_BASE_URL ?? "https://api.insee.fr/api-sirene/3.11";
const API_KEY = process.env.INSEE_API_KEY;

export async function inseeSireneGet<T>(path: string): Promise<T> {
  assert(API_KEY, "INSEE_API_KEY manquante dans l'environnement");

  const url = `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;

  // Timeout simple (évite les requêtes pendantes)
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10_000);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-INSEE-Api-Key-Integration": API_KEY,
        "Accept": "application/json",
      },
      signal: ctrl.signal,
    });

    const contentType = res.headers.get("content-type") ?? "";
    const bodyText = await res.text();

    if (!res.ok) {
      // on remonte un message clair
      throw new Error(
        `INSEE Sirene: HTTP ${res.status} ${res.statusText} content-type=${contentType} body=${bodyText}`
      );
    }

    // l’API répond en JSON
    if (!contentType.toLowerCase().includes("application/json")) {
      throw new Error(
        `INSEE Sirene: réponse non-JSON content-type=${contentType} body=${bodyText}`
      );
    }

    return JSON.parse(bodyText) as T;
  } finally {
    clearTimeout(t);
  }
}
