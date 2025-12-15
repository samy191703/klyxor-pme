export function formatDateFR(iso: string) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("fr-FR").format(d);
  } catch {
    return iso;
  }
}

export function ellipsis(text: string, max = 60) {
  if (!text) return "";
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

/**
 * Format a number into a properly localized Euro currency string.
 * Handles nulls, NaN, and zero gracefully.
 *
 * Example:
 *   formatMoneyEUR(1234.5)  -> "1 234,50 €"
 *   formatMoneyEUR(0)       -> "0,00 €"
 *   formatMoneyEUR(null)    -> "—"
 */
export function formatMoneyEUR(
  value?: number | string | null,
  options?: Intl.NumberFormatOptions
): string {
  if (value === null || value === undefined || value === "") return "—";

  const numeric = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numeric)) return "—";

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(numeric);
}
