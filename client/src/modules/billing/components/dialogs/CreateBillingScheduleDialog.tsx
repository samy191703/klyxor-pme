"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Check, Loader2 } from "lucide-react";
import * as RSelect from "@radix-ui/react-select";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { useToast } from "@/hooks/use-toast";
import { useCreateBillingSchedule } from "../../queries/useCreateBillingSchedule";
import type {
  BillingScheduleCreateDto,
  BillingScheduleGenerateDto,
} from "../../domain/types";
import type { Contract } from "@shared/schema";

export interface ContractOption extends Contract {}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contracts: ContractOption[];
};

export function CreateBillingScheduleDialog({
  open,
  onOpenChange,
  contracts,
}: Props) {
  const { toast } = useToast();
  const { mutateAsync, isPending } = useCreateBillingSchedule();

  const [selectedContractId, setSelectedContractId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Local portal container for Radix popups (prevents dialog focus/portal conflicts)
  const popupContainerRef = useRef<HTMLDivElement | null>(null);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedContractId("");
      setError(null);
    }
  }, [open]);

  // Optionnel : ne garder que les contrats éligibles
  const selectableContracts = useMemo(
    () => contracts /* .filter(
        (c) => c.status !== "terminated" && c.status !== "expired"
      ) */,
    [contracts]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedContractId) {
      setError("Veuillez sélectionner un contrat.");
      return;
    }

    setError(null);

    try {
      const payload: BillingScheduleGenerateDto = {
        id: selectedContractId,
      };

      await mutateAsync(payload);

      toast({
        title: "Échéancier généré",
        description: "Le nouvel échéancier a été généré avec succès.",
      });

      onOpenChange(false);
      setSelectedContractId("");
      // ✅ Les listes sont rafraîchies via onSuccess dans useCreateBillingSchedule
    } catch (e) {
      console.error(e);
      setError(
        "Impossible de générer l’échéancier de facturation pour ce contrat."
      );
      toast({
        title: "Erreur",
        description:
          "Impossible de générer l’échéancier de facturation pour ce contrat.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog
      open={open}
      modal={false}
      onOpenChange={(v) => {
        if (isPending) return;
        onOpenChange(v);
      }}
    >
      <DialogContent className="w-[95vw] max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau plan de facturation</DialogTitle>
          <DialogDescription>
            Sélectionnez un contrat pour générer un nouvel échéancier de
            facturation.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mb-3">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contrat */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Sélectionner un contrat
            </label>

            <RSelect.Root
              value={selectedContractId}
              onValueChange={(value) => {
                setSelectedContractId(value);
                setError(null);
              }}
              disabled={isPending || selectableContracts.length === 0}
            >
              <RSelect.Trigger
                aria-label="Contrat"
                className={`inline-flex w-full items-center justify-between rounded-md border ${
                  !selectedContractId && error
                    ? "border-red-500"
                    : "border-input"
                } bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <RSelect.Value
                  placeholder={
                    selectableContracts.length === 0
                      ? "Aucun contrat disponible"
                      : "Sélectionner un contrat actif..."
                  }
                />
                <RSelect.Icon className="ml-2 opacity-60">
                  <ChevronDown className="h-4 w-4" />
                </RSelect.Icon>
              </RSelect.Trigger>

              <RSelect.Portal
                container={popupContainerRef.current || undefined}
              >
                <RSelect.Content
                  position="popper"
                  side="bottom"
                  align="start"
                  sideOffset={6}
                  onCloseAutoFocus={(e) => e.preventDefault()}
                  className="z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
                >
                  <RSelect.ScrollUpButton className="flex items-center justify-center py-1">
                    <ChevronUp className="h-4 w-4" />
                  </RSelect.ScrollUpButton>

                  {/* 🔥 Make list scrollable here */}
                  <RSelect.Viewport className="max-h-60 overflow-y-auto p-1">
                    {selectableContracts.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        Aucun contrat disponible
                      </div>
                    ) : (
                      selectableContracts.map((c) => (
                        <RSelect.Item
                          key={c.id}
                          value={c.id}
                          className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground"
                        >
                          <RSelect.ItemText>
                            {c.number} — {c.title}
                          </RSelect.ItemText>
                          <RSelect.ItemIndicator className="absolute right-2 inline-flex items-center">
                            <Check className="h-4 w-4" />
                          </RSelect.ItemIndicator>
                        </RSelect.Item>
                      ))
                    )}
                  </RSelect.Viewport>

                  <RSelect.ScrollDownButton className="flex items-center justify-center py-1">
                    <ChevronDown className="h-4 w-4" />
                  </RSelect.ScrollDownButton>
                </RSelect.Content>
              </RSelect.Portal>
            </RSelect.Root>

            <p className="text-xs text-gray-500">
              Seuls les contrats actifs et non déjà résiliés/expirés sont
              listés.
            </p>
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={!selectedContractId || isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Générer l’échéancier
            </Button>
          </DialogFooter>
        </form>

        {/* Stable portal container (like in CreateTerminationDialog) */}
        <div ref={popupContainerRef} />
      </DialogContent>
    </Dialog>
  );
}
