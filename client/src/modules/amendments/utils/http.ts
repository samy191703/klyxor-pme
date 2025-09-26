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
        .join(", ");
      if (joined) return joined;
    }

    // 2) message → "error : message" (or just message)
    if (typeof p.message === "string" && p.message.trim()) {
      const msg = p.message.trim();
      const errTxt =
        typeof p.error === "string" && p.error.trim() ? p.error.trim() : "";
      return errTxt ? `${errTxt} : ${msg}` : msg;
    }

    // 3) error
    if (typeof p.error === "string" && p.error.trim()) {
      return p.error.trim();
    }

    return null;
  };

  const stripPrefixes = (s: string) =>
    s
      .replace(/^\s*Error:\s*/i, "")
      .replace(/^\s*\d{3}\s*:\s*/, "")
      .trim();

  const extractLastJson = (s?: string): any | null => {
    if (!s) return null;
    let i = s.length - 1;
    while (i >= 0 && s[i] !== "}") i--;
    if (i < 0) return null;
    let depth = 0;
    for (let j = i; j >= 0; j--) {
      if (s[j] === "}") depth++;
      else if (s[j] === "{") {
        depth--;
        if (depth === 0) {
          const candidate = s.slice(j, i + 1);
          try {
            return JSON.parse(candidate);
          } catch {
            return null;
          }
        }
      }
    }
    return null;
  };

  // 1) Structured axios/fetch payloads
  const ax = err?.response?.data;
  if (isStructured(ax)) {
    const desc = fromPayload(ax);
    if (desc) return { title: "Erreur", description: desc };
  }

  const data = err?.data;
  if (isStructured(data)) {
    const desc = fromPayload(data);
    if (desc) return { title: "Erreur", description: desc };
  }

  // 2) Direct thrown payload ONLY if structured (avoid plain Error objects)
  if (isStructured(err)) {
    const desc = fromPayload(err);
    if (desc) return { title: "Erreur", description: desc };
  }

  // 3) Parse JSON tail from Error.message
  if (typeof err?.message === "string") {
    const cleaned = stripPrefixes(err.message);
    const parsed = extractLastJson(cleaned);
    const desc = fromPayload(parsed);
    if (desc) return { title: "Erreur", description: desc };

    if (!/^\{[\s\S]*\}$/.test(cleaned) && cleaned) {
      return { title: "Erreur", description: cleaned };
    }
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
