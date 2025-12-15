import { useEffect, useState } from "react";

export function useClientContracts(clientId?: string) {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;

    const controller = new AbortController();

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/clients/${clientId}/contracts`, {
          signal: controller.signal,
        });

        if (!res.ok) throw new Error("Erreur chargement contrats");

        const data = await res.json();
        setContracts(data);
      } catch (err: any) {
        if (err.name === "AbortError") return;
        setError(err?.message || "Erreur");
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [clientId]);

  return { contracts, loading, error };
}
