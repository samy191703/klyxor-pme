// src/modules/clients/utils/http.ts
export function extractApiError(err: any): {
  title: string;
  description: string;
} {
  const FALLBACK = "Une erreur est survenue.";

  const isStructured = (p: any) =>
    p && typeof p === "object" && ("error" in p || "errors" in p);

  const fromPayload = (p?: any): string | null => {
    if (!p || typeof p !== "object") return null;

    // 1) errors[] → join messages
    if (Array.isArray(p.errors) && p.errors.length) {
      const joined = p.errors
        .map((e: any) => (typeof e?.message === "string" ? e.message : null))
        .filter(Boolean)
        .join(" / ");
      if (joined) return joined;
    }

    // 2) error: string
    if (typeof p.error === "string" && p.error.trim()) {
      return p.error;
    }

    // 3) message
    if (typeof p.message === "string" && p.message.trim()) {
      return p.message;
    }

    return null;
  };

  const extractLastJson = (s: string): any | null => {
    const idx = s.lastIndexOf("{");
    if (idx === -1) return null;
    const maybe = s.slice(idx);
    try {
      return JSON.parse(maybe);
    } catch {
      return null;
    }
  };

  const stripPrefixes = (s: string) =>
    s.replace(/^[A-Z0-9_]+:\s*/i, "").trim();

  // 1) fetch Response with JSON body
  if (err?.json && typeof err.json === "function") {
    return err
      .json()
      .then((p: any) => {
        const desc = fromPayload(p);
        return {
          title: "Erreur",
          description: desc || FALLBACK,
        };
      })
      .catch(() => ({
        title: "Erreur",
        description: FALLBACK,
      })) as any;
  }

  // 2) Axios error
  if (err?.response?.data && isStructured(err.response.data)) {
    const desc = fromPayload(err.response.data) ?? FALLBACK;
    return { title: "Erreur", description: desc };
  }

  // 3) { error, errors, message }
  if (isStructured(err)) {
    const desc = fromPayload(err) ?? FALLBACK;
    return { title: "Erreur", description: desc };
  }

  // 4) Raw string like "403: {...}"
  if (typeof err === "string") {
    const cleaned = stripPrefixes(err);
    const parsed = extractLastJson(cleaned);
    const desc = fromPayload(parsed);
    if (desc) return { title: "Erreur", description: desc };
    if (!/^\{[\s\S]*\}$/.test(cleaned) && cleaned) {
      return { title: "Erreur", description: cleaned };
    }
  }

  // 5) Fallback
  return { title: "Erreur", description: FALLBACK };
}
