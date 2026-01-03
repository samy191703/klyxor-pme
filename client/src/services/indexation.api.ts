import { CalculateDto } from "@/_dtos/calculate-indexation.dto";

export async function fetchIndexationFormulas() {
  const res = await fetch("/api/indexation-formulas");
  if (!res.ok) throw new Error("Unable to load indexation formulas");
  return res.json();
}

export async function postIndexationPreview(
  dto: CalculateDto,
  endpoint?: string
) {
  const url = "https://index.klyxor.com/api/v1/calculate-from-assets";
  /*     endpoint ||
    (process.env.INDEXATION_ENGINE_URL
      ? `${process.env.INDEXATION_ENGINE_URL}/api/v1/calculate-from-assets`
      : "https://index.klyxor.com/api/v1/calculate-from-assets"); */
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(
      `Échec du calcul (${res.status}): ${txt || "voir logs serveur"}`
    );
  }
  return res.json();
}
