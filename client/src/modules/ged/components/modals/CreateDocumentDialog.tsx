// src/_app/ged/components/modals/CreateDocumentDialog.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as RSelect from "@radix-ui/react-select";
import { ChevronDown, ChevronUp, Check, Info } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import GEDUploader from "../GEDUploader";

type ContractOption = {
  id: string;
  number?: string;
  title?: string;
  status?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  contracts?: ContractOption[];
  defaultContractId?: string;
};

export default function CreateDocumentDialog({
  open,
  onClose,
  contracts = [],
  defaultContractId,
}: Props) {
  const [contractId, setContractId] = useState<string | undefined>(
    defaultContractId
  );

  // Stable portal container for Radix popups (prevents Dialog focus/portal conflicts)
  const popupContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) setContractId(defaultContractId);
  }, [open, defaultContractId]);

  const selectableContracts = useMemo(
    () =>
      (contracts ?? []).filter(
        (c) =>
          (c.status ?? "").toLowerCase() !== "terminated" &&
          (c.status ?? "").toLowerCase() !== "expired"
      ),
    [contracts]
  );

  const options = useMemo(
    () =>
      selectableContracts.map((c) => ({
        id: String(c.id),
        label: [c.number, c.title].filter(Boolean).join(" — ") || String(c.id),
      })),
    [selectableContracts]
  );

  return (
    <Dialog
      open={open}
      modal={false}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      {/* Remove default padding to control header/body layout and scrolling precisely */}
      <DialogContent
        className="w-[95vw] max-w-3xl p-0"
        style={{ scrollbarGutter: "stable" }}
      >
        {/* Header is outside the scroller so it never scrolls away */}
        <div className="px-6 pt-6">
          <DialogHeader>
            <DialogTitle>Ajouter des documents</DialogTitle>
            <DialogDescription>
              Choisissez un contrat, puis glissez-déposez vos fichiers ou
              cliquez pour parcourir. Les métadonnées de lot (type, catégorie,
              confidentiel) s’appliquent à tous les fichiers envoyés en une
              fois.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable body */}
        <div className="px-6 pb-6 pt-4 max-h-[75vh] overflow-y-auto">
          <div className="space-y-4">
            {/* Contract selector (Radix Select with stable portal container) */}
            <div className="grid gap-2">
              <Label>Contrat associé</Label>

              <RSelect.Root
                value={contractId}
                onValueChange={(v) => setContractId(v)}
              >
                <RSelect.Trigger
                  aria-label="Contrat"
                  className="inline-flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RSelect.Value placeholder="Sélectionner un contrat actif..." />
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

                    <RSelect.Viewport className="p-1">
                      {options.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          Aucun contrat disponible
                        </div>
                      ) : (
                        options.map((o) => (
                          <RSelect.Item
                            key={o.id}
                            value={o.id}
                            className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground"
                          >
                            <RSelect.ItemText>{o.label}</RSelect.ItemText>
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

            {/* Uploader */}
            {contractId ? (
              <GEDUploader
                entity={{ scope: "contract", id: contractId }}
                title="Téléverser des documents"
              />
            ) : (
              <Card className="bg-amber-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2 text-sm">
                    <Info className="w-4 h-4 text-amber-600 mt-0.5" />
                    <div>
                      <div className="font-medium">
                        Sélection de contrat requise
                      </div>
                      Choisissez un contrat pour activer la zone de
                      téléversement.
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Stable portal container for Radix popups (keep inside content so it remains mounted) */}
          <div ref={popupContainerRef} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
