import { useEffect, useMemo, useState } from "react";

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
import { useUpdateAmendment } from "../queries/useUpdateAmendment";
import type {
  Amendment,
  AmendmentUpdateDto,
  AmendmentType,
} from "../domain/types";
import { AMENDMENT_TYPE_LABELS } from "../domain/constants";
import { extractApiError } from "../utils/http";

type ContractOption = { id: string | number; number: string; title: string };
type ContractComboOption = { label: string; value: string };

export function EditAmendmentDialog({
  open,
  onOpenChange,
  a,
  canEdit,
  // Either pass a full list (like creation)...
  contracts,
  // ...or just the current contractId and a loader to fetch its label
  contractId,
  loadContractById,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  a?: Amendment | null;
  canEdit: boolean;

  contracts?: ContractOption[];
  contractId?: string | number;
  loadContractById?: (id: string | number) => Promise<ContractOption | null>;
}) {
  const { toast } = useToast();
  const mutation = useUpdateAmendment();
  const isSubmitting = Boolean(
    (mutation as any)?.isPending ?? (mutation as any)?.isLoading
  );

  // Form state — same shape as creation, but for update
  const [form, setForm] = useState<{
    contractId: string; // editable like creation
    type: AmendmentType;
    title: string;
    description: string;
    effectiveDate: string;
    originalAmount?: number;
    newAmount?: number;
  }>({
    contractId: "",
    type: "price_revision",
    title: "",
    description: "",
    effectiveDate: "",
    originalAmount: undefined,
    newAmount: undefined,
  });

  // Build Autocomplete options when list provided
  const contractOptions: ContractComboOption[] = useMemo(
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

  // Preload form from amendment `a`
  useEffect(() => {
    if (!a) return;
    setForm((prev) => ({
      ...prev,
      contractId: String(a.contractId ?? prev.contractId ?? ""),
      type: a.type as AmendmentType,
      title: a.title ?? "",
      description: a.description ?? "",
      effectiveDate: a.effectiveDate ? a.effectiveDate.split("T")[0] : "",
      originalAmount: a.originalAmount ?? undefined,
      newAmount: a.newAmount ?? undefined,
    }));
  }, [a?.id]);

  // If no contracts list is provided but we have a contractId, fetch its label once
  useEffect(() => {
    const needFetch =
      !contracts?.length && (a?.contractId ?? contractId) && loadContractById;
    if (!needFetch) return;

    (async () => {
      try {
        const cid = a?.contractId ?? contractId!;
        const c = await loadContractById!(cid);
        // If you want to show a read-only field when no list is provided,
        // consider storing a local "fetchedContractLabel" state and render a TextField disabled.
        // Here we just ensure the form has the id set.
        setForm((f) => ({ ...f, contractId: String(cid) }));
      } catch {
        // Silent fail; keep contractId
      }
    })();
  }, [contracts?.length, a?.contractId, contractId, loadContractById]);

  // Visibility rules — identical to creation
  const showPriceFields = form.type === "price_revision";
  const showDateField = form.type === "duration_extension";
  const showDescription = true;
  const showTitle = form.type === "scope_change";
  const showIndexationInfo = form.type === "indexation_change";

  // Client-side validation — identical to creation
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
    if (!a) return;

    const errorMsg = validate();
    if (errorMsg) {
      toast({ title: "Erreur", description: errorMsg, variant: "destructive" });
      return;
    }

    try {
      // Build payload like creation, but for PUT/PATCH
      const payload: AmendmentUpdateDto = {
        //contractId: form.contractId ? String(form.contractId) : undefined,
        type: form.type, // kept editable as requested (same as creation)
        title: showTitle ? form.title : undefined,
        description: showDescription ? form.description : undefined,
        effectiveDate: showDateField ? form.effectiveDate : undefined,
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

      await mutation.mutateAsync({ id: a.id, payload });
      toast({
        title: "Avenant modifié",
        description: "L'avenant a été modifié avec succès",
      });
      onOpenChange(false);
    } catch (error: any) {
      const { description } = extractApiError(error);
      toast({
        title: "Erreur lors de la modification de l'avenant",
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
      <DialogTitle
        sx={{
          position: "relative",
          pr: 2,
          mr: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 0.5,
        }}
      >
        {/* Main Title */}
        <Typography
          variant="h6"
          component="div"
          sx={{ fontWeight: "bold", color: "primary.main" }}
        >
          {a ? `Mise à jour Avenant #${a.number}` : "Mise à jour de l'avenant"}
        </Typography>

        {/* Subtitle */}
        {a?.contractNumber && (
          <Typography
            variant="subtitle2"
            component="div"
            sx={{ color: "secondary.main", fontWeight: 500 }}
          >
            Contrat : {a.contractNumber}
          </Typography>
        )}

        {/* Close Icon */}
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
          Mettez à jour les informations de l’avenant
        </p>

        <Box className="space-y-4 py-4">
          {/* Contract — same UX as creation if list provided, else show a read-only field */}
          {/*  {contracts?.length ? (
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
                    "data-testid": "edit-select-contract",
                  }}
                />
              )}
            />
          ) : (
            <TextField
              fullWidth
              disabled
              label="Contrat *"
              value={
                form.contractId
                  ? String(form.contractId)
                  : "Contrat non défini"
              }
              helperText="(Lecture seule — liste non fournie)"
            />
          )}
 */}
          {/* Type — editable like creation */}
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
            inputProps={{ "data-testid": "edit-select-type" }}
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
              inputProps={{ "data-testid": "edit-effective-date" }}
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
              inputProps={{ "data-testid": "edit-title" }}
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
                value={form.originalAmount ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    originalAmount:
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                  }))
                }
                disabled={isSubmitting}
                inputProps={{ "data-testid": "edit-original-amount" }}
              />
              <TextField
                type="number"
                fullWidth
                label="Nouveau montant"
                placeholder="0.00"
                value={form.newAmount ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    newAmount:
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                  }))
                }
                disabled={isSubmitting}
                inputProps={{ "data-testid": "edit-new-amount" }}
              />
            </Box>
          )}

          {/* Indexation info */}
          {showIndexationInfo && (
            <Alert severity="info" variant="outlined">
              <Typography fontWeight={600} gutterBottom>
                Étape d’indexation — détails requis
              </Typography>
              <Typography variant="body2">
                Cette demande concerne une <b>modification de l’indexation</b>.
                Merci de préciser dans l’avenant (ou en pièce jointe) :
                <br />• Formule actuelle (indice, pondérations, fréquence)
                <br />• Nouvelle formule proposée / paramètres modifiés
                <br />• Date d’entrée en vigueur et règles de transition
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
              inputProps={{ "data-testid": "edit-description" }}
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
          disabled={!canEdit || isSubmitting}
          data-testid="button-save"
          endIcon={
            isSubmitting ? (
              <CircularProgress size={20} sx={{ ml: 0.5 }} />
            ) : null
          }
        >
          {isSubmitting ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
