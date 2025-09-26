import { useMemo, useState } from "react";

// MUI
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
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import CloseIcon from "@mui/icons-material/Close";

import { useToast } from "@/hooks/use-toast";
import { useCreateAmendment } from "../queries/useCreateAmendment";
import type { AmendmentCreateDto, AmendmentType } from "../domain/types";
import { AMENDMENT_TYPE_LABELS } from "../domain/constants";
import { extractApiError } from "../utils/http";

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
  const isSubmitting = Boolean(
    (mutation as any)?.isPending ?? (mutation as any)?.isLoading
  );

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
      if (form.originalAmount === undefined || form.originalAmount === null)
        return "Veuillez saisir le montant original.";
      if (form.newAmount === undefined || form.newAmount === null)
        return "Veuillez saisir le nouveau montant.";
    }

    if (form.type === "duration_extension") {
      if (!form.effectiveDate)
        return "Veuillez saisir la nouvelle date d'effet.";
    }

    if (form.type === "scope_change") {
      if (!form.title?.trim())
        return "Veuillez décrire le changement de périmètre.";
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
      const payload: AmendmentCreateDto = {
        ...form,
        originalAmount:
          form.type === "price_revision"
            ? Number(form.originalAmount)
            : undefined,
        newAmount:
          form.type === "price_revision" ? Number(form.newAmount) : undefined,
      };

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
    } catch (error: any) {
      const { title, description } = extractApiError(error);
      toast({
        title: "Erreur lors de la création de l'avenant",
        description,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!isSubmitting) onOpenChange(false);
      }}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle sx={{ position: "relative", mr: 1 }}>
        Créer un nouvel avenant
        {/* Top-right animated close icon */}
        <IconButton
          aria-label="Fermer"
          onClick={() => onOpenChange(false)}
          disabled={isSubmitting}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            transition:
              "transform 180ms ease, opacity 180ms ease, box-shadow 180ms ease",
            "&:hover": {
              transform: "rotate(90deg) scale(1.08)",
              boxShadow: (theme) => `0 0 0 6px ${theme.palette.action.hover}`,
            },
            "&:active": { transform: "rotate(90deg) scale(0.98)" },
            opacity: isSubmitting ? 0.6 : 1,
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <p className="text-sm text-muted-foreground">
          Remplissez les informations pour créer un nouvel avenant
        </p>

        <Box className="space-y-4 py-4">
          {/* Contract */}
          <Autocomplete
            disablePortal={false}
            options={contractOptions}
            value={selectedContract}
            onChange={(_, opt) =>
              setForm((f) => ({ ...f, contractId: opt?.value ?? "" }))
            }
            disabled={isSubmitting}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Contrat *"
                fullWidth
                disabled={isSubmitting}
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
            disabled={isSubmitting}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                type: e.target.value as AmendmentType,
              }))
            }
            SelectProps={{
              MenuProps: {
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
              inputProps={{ "data-testid": "input-title" }}
            />
          )}

          {/* Price fields */}
          {showPriceFields && (
            <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
                inputProps={{ "data-testid": "input-new-amount" }}
              />
            </Box>
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
              disabled={isSubmitting}
              inputProps={{ "data-testid": "textarea-description" }}
            />
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ gap: 1.5 }}>
        <Button
          size="large"
          variant="outlined"
          onClick={() => onOpenChange(false)}
          disabled={isSubmitting}
        >
          Annuler
        </Button>
        <Button
          size="large"
          variant="contained"
          onClick={submit}
          disabled={!canCreate || isSubmitting}
          data-testid="button-create"
          endIcon={
            isSubmitting ? (
              <CircularProgress size={20} sx={{ ml: 0.5 }} />
            ) : null
          }
        >
          {isSubmitting ? "Création..." : "Créer l'avenant"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
