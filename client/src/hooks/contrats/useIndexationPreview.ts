import { useState } from "react";
import { buildCalculateFromAssetsPayload } from "../../pages/contracts/domain/buildCalculatePayload";
import {
  postIndexationPreview,
  fetchIndexationFormulas,
} from "../../services/indexation.api";

export function useIndexationPreview() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [formulas, setFormulas] = useState<any[]>([]);

  async function ensureFormulas() {
    if (formulas.length === 0) {
      const list = await fetchIndexationFormulas();
      setFormulas(list || []);
    }
  }

  async function calculate(wizardData: any) {
    try {
      setLoading(true);
      setError(null);
      await ensureFormulas();
      const dto = buildCalculateFromAssetsPayload(wizardData, formulas);
      const preview = await postIndexationPreview(dto);
      setResult(preview);
    } catch (e: any) {
      setError(e?.message || "Erreur inconnue pendant le calcul.");
    } finally {
      setLoading(false);
    }
  }

  return { calculate, loading, error, result, formulas };
}
