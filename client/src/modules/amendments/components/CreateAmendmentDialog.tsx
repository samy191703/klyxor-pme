import { useMemo, useState } from "react";

// ⬇️ MUI dialog + controls
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Autocomplete from "@mui/material/Autocomplete";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";

import { useToast } from "@/hooks/use-toast";
import { useCreateAmendment } from "../queries/useCreateAmendment";
import type { AmendmentCreateDto, AmendmentType } from "../domain/types";
import { AMENDMENT_TYPE_LABELS } from "../domain/constants";

type ContractOption = { id: string | number; number: string; title: string };

export function CreateAmendmentDialog({
  open,
  onOpenChange,
  contracts,
  canCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contracts: ContractOption[];
  canCreate: boolean;
}) {
  const { toast } = useToast();
  const mutation = useCreateAmendment();

  const [form, setForm] = useState<
    Omit<AmendmentCreateDto, "impactDescription">
  >({
    contractId: "",
    type: "price_revision",
    title: "",
    description: "",
    effectiveDate: "",
    originalAmount: 0,
    newAmount: 0,
  });

  const contractOptions = useMemo(
    () =>
      (contracts ?? []).map((c) => ({
        label: `${c.number} - ${c.title}`,
        value: String(c.id),
      })),
    [contracts]
  );

  const selectedContract = useMemo(
    () => contractOptions.find((o) => o.value === form.contractId) ?? null,
    [contractOptions, form.contractId]
  );

  // Visibility rules
  const showPriceFields = form.type === "price_revision";
  const showDateField = form.type === "duration_extension";
  const showDescription = true;
  const showTitle = form.type === "scope_change";
  const showIndexationInfo = form.type === "indexation_change";

  const validate = () => {
    if (!form.contractId) return "Veuillez sélectionner un contrat.";
    if (showTitle && !form.title.trim()) return "Veuillez saisir un titre.";

    if (form.type === "price_revision") {
      //if (!form.effectiveDate) return "Veuillez saisir la date d'effet.";
      if (!form.originalAmount) return "Veuillez saisir le montant original.";
      if (!form.newAmount) return "Veuillez saisir le nouveau montant.";
    }

    if (form.type === "duration_extension") {
      if (!form.effectiveDate)
        return "Veuillez saisir la nouvelle date d'effet.";
    }

    if (form.type === "scope_change") {
      if (!form.title?.trim())
        return "Veuillez décrire le changement de périmètre.";
      /*  if (!form.description?.trim())
        return "Veuillez décrire le changement de périmètre."; */
    }

    return null;
  };

  const submit = async () => {
    const errorMsg = validate();
    if (errorMsg) {
      toast({ title: "Erreur", description: errorMsg, variant: "destructive" });
      return;
    }

    try {
      // Build payload with numeric amounts for price_revision
      const payload: AmendmentCreateDto = {
        ...form,
        originalAmount:
          form.type === "price_revision"
            ? Number(form.originalAmount)
            : undefined,
        newAmount:
          form.type === "price_revision" ? Number(form.newAmount) : undefined,
      };

      // Optional: guard against NaN
      if (
        form.type === "price_revision" &&
        (Number.isNaN(payload.originalAmount!) ||
          Number.isNaN(payload.newAmount!))
      ) {
        toast({
          title: "Erreur",
          description: "Les montants doivent être numériques.",
          variant: "destructive",
        });
        return;
      }

      await mutation.mutateAsync(payload as AmendmentCreateDto);
      toast({
        title: "Avenant créé",
        description: "L'avenant a été créé avec succès",
      });
      onOpenChange(false);
      setForm({
        contractId: "",
        type: "price_revision",
        title: "",
        description: "",
        effectiveDate: "",
        originalAmount: 0,
        newAmount: 0,
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de créer l'avenant",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>Créer un nouvel avenant</DialogTitle>

      <DialogContent dividers>
        <p className="text-sm text-muted-foreground">
          Remplissez les informations pour créer un nouvel avenant
        </p>

        <div className="space-y-4 py-4">
          {/* Contract */}
          <Autocomplete
            disablePortal={false} // use portal; works perfectly with MUI Dialog
            options={contractOptions}
            value={selectedContract}
            onChange={(_, opt) =>
              setForm((f) => ({ ...f, contractId: opt?.value ?? "" }))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Contrat *"
                fullWidth
                inputProps={{
                  ...params.inputProps,
                  "data-testid": "select-contract",
                }}
              />
            )}
          />

          {/* Type */}
          <TextField
            select
            fullWidth
            label="Type *"
            value={form.type}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                type: e.target.value as AmendmentType,
              }))
            }
            SelectProps={{
              MenuProps: {
                // MUI Dialog + MUI Menu are compatible; defaults are fine
                // Keep portal (default) for correct positioning.
                anchorOrigin: { vertical: "bottom", horizontal: "left" },
                transformOrigin: { vertical: "top", horizontal: "left" },
              },
            }}
            inputProps={{ "data-testid": "select-type" }}
          >
            {Object.entries(AMENDMENT_TYPE_LABELS).map(([v, l]) => (
              <MenuItem key={v} value={v}>
                {l}
              </MenuItem>
            ))}
          </TextField>

          {/* Date d'effet */}
          {showDateField && (
            <TextField
              type="date"
              fullWidth
              label="Date d'effet *"
              value={form.effectiveDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, effectiveDate: e.target.value }))
              }
              inputProps={{ "data-testid": "input-effective-date" }}
              InputLabelProps={{ shrink: true }}
            />
          )}

          {/* Titre */}
          {showTitle && (
            <TextField
              fullWidth
              label="Titre *"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="Titre de l'avenant"
              inputProps={{ "data-testid": "input-title" }}
            />
          )}

          {/* Price fields */}
          {showPriceFields && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField
                type="number"
                fullWidth
                label="Montant original"
                placeholder="0.00"
                value={form.originalAmount}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    originalAmount: Number(e.target.value),
                  }))
                }
                inputProps={{ "data-testid": "input-original-amount" }}
              />
              <TextField
                type="number"
                fullWidth
                label="Nouveau montant"
                placeholder="0.00"
                value={form.newAmount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, newAmount: Number(e.target.value) }))
                }
                inputProps={{ "data-testid": "input-new-amount" }}
              />
            </div>
          )}

          {/* Indexation info */}
          {showIndexationInfo && (
            <Alert severity="info" variant="outlined">
              <Typography fontWeight={600} gutterBottom>
                Étape d’indexation — détails requis pour le bon développement
              </Typography>
              <Typography variant="body2">
                Cette demande concerne une <b>modification de l’indexation</b>.
                Merci de préciser dans l’avenant (ou en pièce jointe) :
                <br />• La formule actuelle d’indexation (indice, pondérations,
                fréquence)
                <br />• La nouvelle formule proposée (ou paramètres modifiés)
                <br />• La date d’entrée en vigueur et les règles de transition
              </Typography>
            </Alert>
          )}
          {/* Description */}
          {showDescription && (
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Description"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              inputProps={{ "data-testid": "textarea-description" }}
            />
          )}
        </div>
      </DialogContent>

      <DialogActions>
        <Button
          size="large"
          variant="outlined"
          onClick={() => onOpenChange(false)}
        >
          Annuler
        </Button>
        <Button
          size="large"
          variant="contained"
          onClick={submit}
          disabled={!canCreate}
          data-testid="button-create"
        >
          Créer l'avenant
        </Button>
      </DialogActions>
    </Dialog>
  );
}
