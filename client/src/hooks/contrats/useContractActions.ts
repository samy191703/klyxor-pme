import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function useContractActions() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const createContract = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create contract");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "Contrat créé",
        description: "Le contrat a été créé avec le statut 'À valider'.",
      });
    },
    onError: () =>
      toast({
        title: "Erreur",
        description: "Impossible de créer le contrat.",
        variant: "destructive",
      }),
  });

  function onValidate(contract: any, decision: "validate" | "reject") {
    // TODO: call your backend
    toast({
      title: decision === "validate" ? "Contrat validé" : "Contrat rejeté",
    });
    qc.invalidateQueries({ queryKey: ["/api/contracts"] });
  }

  return { createContract: createContract.mutate, onValidate };
}
